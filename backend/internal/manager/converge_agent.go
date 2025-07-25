package manager

import (
	"context"
	"time"

	ngrok "golang.ngrok.com/ngrok/v2"

	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func (m *manager) convergeAgent(ctx context.Context, config store.AgentConfig) error {
	if config.ExpectedState == AgentStateOffline {
		m.handleAgentOfflineState()
	}
	if config.ExpectedState == AgentStateOnline {
		if err := m.handleAgentOnlineState(ctx, config); err != nil {
			return err
		}
	}
	m.agentConfig = config
	return nil
}

// handleAgentOfflineState manages disconnecting the agent and setting offline
// status. it disconnects the agent and sets the state to offline
func (m *manager) handleAgentOfflineState() {
	m.disconnectAgent()
	m.setAgentOffline(nil)
}

// handleAgentOnlineState manages creating/connecting the agent for online state
func (m *manager) handleAgentOnlineState(ctx context.Context, config store.AgentConfig) error {
	isConfigChanged := m.agentConfigChanged(config)
	// Disconnect if config changed
	if m.agent != nil && isConfigChanged {
		m.disconnectAgent()
	}
	// Create agent if needed
	if m.agent == nil {
		if err := m.createAgent(config); err != nil {
			return err
		}
	}
	// Connect if we're offline or if config changed
	isOffline := m.getAgentStatusState() == AgentStateOffline
	shouldConnect := isOffline || isConfigChanged
	if shouldConnect {
		err := m.connectAgent(ctx)
		return err
	}
	return nil
}

// createAgent creates a new ngrok agent with the given configuration
func (m *manager) createAgent(config store.AgentConfig) error {
	var opts []ngrok.AgentOption
	opts = append(opts,
		ngrok.WithClientInfo("ngrok-docker-desktop-extension", m.ExtensionVersion),
		ngrok.WithEventHandler(m.handleAgentEvent),
	)

	if config.AuthToken != "" {
		opts = append(opts, ngrok.WithAuthtoken(config.AuthToken))
	}
	if config.ConnectURL != "" {
		opts = append(opts, ngrok.WithAgentConnectURL(config.ConnectURL))
	}

	agent, err := m.NgrokSDK.NewAgent(opts...)
	if err != nil {
		m.setAgentOffline(err)
		return err
	}

	m.agent = agent
	return nil
}

// connectAgent connects the current agent and updates status
func (m *manager) connectAgent(ctx context.Context) error {
	// We set status to connecting before the connection attempt so that if
	// connection hangs that users understand that we're in progress trying to
	// connect.
	m.setAgentConnecting(nil)

	// Create a new context for agent operations. This is because the ngrok-go
	// library unhelpfully uses the passed in context as the lifetime of _the
	// whole agent_, not just the connection attempt.
	m.agentCtx, m.agentCancel = context.WithCancel(context.Background())

	// We connect the agent async so that we're not blocking convergence /
	// holding a lock while we do it.
	ch := make(chan error)
	agent := m.agent
	go func() {
		defer close(ch)
		err := agent.Connect(m.agentCtx)
		if err != nil {
			m.setAgentOffline(err)
		} else {
			m.setAgentOnline()
		}
	}()
	// In the happy path case, the agent connects quickly and it's nice to wait
	// for that so that callers set the online state immediately in the API
	// response to PUT /endpoints and don't have to wait for the polling loop to
	// pick up that the agent successfully connected.
	//
	// This probably belongs in the handler but it's not worth the lift to plumb
	// the appropriate channels up to it.
	select {
	case <-ch:
	case <-time.After(time.Second):
	case <-ctx.Done():
	}
	return nil
}

// disconnect the agent
func (m *manager) disconnectAgent() {
	// we disconnect the agent by canceling the context because ngrok-go's
	// agent.Disconnect() can block and hang indefinitely
	m.cancelAgentContext()
	if m.agent != nil {
		m.agent = nil
	}

	// when you explicitly disconnect the agent, all endpoints need to be
	// restarted because the Forwarders / AgentEndpoints are effectively dead at
	// that point.
	//
	// we clear out their state so that the convergence loop will
	// start them again.
	for id := range m.endpointStatus {
		m.handleEndpointOfflineState(id)
	}
}

// cancelAgentContext cancels the current agent context if it exists
func (m *manager) cancelAgentContext() {
	if m.agentCancel != nil {
		m.agentCancel()
		m.agentCancel = nil
		m.agentCtx = nil
	}
}

// handleAgentEvent processes ngrok agent events
//
// online/offline events trigger convergence so that e.g. endpoints get started
// immediately after reconnect
func (m *manager) handleAgentEvent(event ngrok.Event) {
	switch e := event.(type) {
	case *ngrok.EventAgentConnectSucceeded:
		m.setAgentOnline()
		m.setEndpointsAgentConnected()
		m.triggerConverge()
	case *ngrok.EventAgentDisconnected:
		if e.Error != nil {
			m.setAgentConnecting(e.Error)
			m.setEndpointsAgentDisconnected()
		} else {
			m.setAgentOffline(e.Error)
		}
		m.triggerConverge()
	case *ngrok.EventAgentHeartbeatReceived:
		m.updateAgentLatency(e.Latency)
	}
}

// agentConfigChanged checks if agent properties requiring reconnection have changed
func (m *manager) agentConfigChanged(newConfig store.AgentConfig) bool {
	return m.agentConfig.AuthToken != newConfig.AuthToken ||
		m.agentConfig.ConnectURL != newConfig.ConnectURL
}

// setAgentConnecting sets the agent status to connecting with an optional error
// message
func (m *manager) setAgentConnecting(err error) {
	m.agentMu.Lock()
	defer m.agentMu.Unlock()

	var lastError string
	if err != nil {
		lastError = err.Error()
	}
	m.agentStatus = AgentStatus{
		State:       AgentStateConnecting,
		LastError:   lastError,
		Latency:     0,
		ConnectedAt: time.Time{},
	}
}

// setAgentOnline sets the agent status to online with current timestamp
func (m *manager) setAgentOnline() {
	m.agentMu.Lock()
	defer m.agentMu.Unlock()

	m.agentStatus = AgentStatus{
		State:       AgentStateOnline,
		LastError:   "",
		Latency:     0,
		ConnectedAt: time.Now(),
	}
}

// setAgentOffline sets the agent status to offline with optional error
func (m *manager) setAgentOffline(err error) {
	m.agentMu.Lock()
	defer m.agentMu.Unlock()

	var lastError string
	if err != nil {
		lastError = err.Error()
	}
	m.agentStatus = AgentStatus{
		State:       AgentStateOffline,
		ConnectedAt: time.Time{},
		LastError:   lastError,
		Latency:     0,
	}
}

func (m *manager) updateAgentLatency(latency time.Duration) {
	m.agentMu.Lock()
	defer m.agentMu.Unlock()

	if m.agentStatus.State == AgentStateOnline {
		m.agentStatus.Latency = latency
	}
}

func (m *manager) getAgentStatusState() string {
	m.agentMu.RLock()
	defer m.agentMu.RUnlock()
	return m.agentStatus.State
}
