package manager

import (
	"context"
	"log/slog"
	"maps"
	"sync"
	"time"

	ngrok "golang.ngrok.com/ngrok/v2"

	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

type manager struct {
	Store            store.Store
	NgrokSDK         NgrokSDK
	DockerClient     DockerClient
	ProtocolDetector ProtocolDetector
	Logger           *slog.Logger
	ExtensionVersion string // Extension version for client info

	// Runtime state
	mu                 sync.RWMutex
	agentMu            sync.RWMutex // Dedicated mutex for agent status
	endpointMu         sync.RWMutex // Dedicated mutex for endpoint status
	agent              ngrok.Agent
	agentCtx           context.Context    // Context for agent operations
	agentCancel        context.CancelFunc // Cancel function for agent context
	agentStatus        AgentStatus
	agentConfig        store.AgentConfig                  // Track current agent config for comparison
	endpointStatus     map[string]EndpointStatus          // Track endpoint runtime status
	endpointForwarders map[string]ngrok.EndpointForwarder // Track active forwarders
	endpointCancels    map[string]context.CancelFunc      // Track forwarder cancel functions
	endpointConfigs    map[string]string                  // Track last known config hashes for change detection

	// Converge loop state
	convergeInterval time.Duration
	convergeTicker   *time.Ticker
	convergeCtx      context.Context
	convergeCancel   context.CancelFunc
	triggerChan      chan struct{}
}

// NewManager creates a new manager instance
func NewManager(store store.Store, ngrokSDK NgrokSDK, docker DockerClient, protocolDetector ProtocolDetector, logger *slog.Logger, extensionVersion string, convergeInterval time.Duration) Manager {
	m := &manager{
		Store:            store,
		NgrokSDK:         ngrokSDK,
		DockerClient:     docker,
		ProtocolDetector: protocolDetector,
		Logger:           logger,
		ExtensionVersion: extensionVersion,
		convergeInterval: convergeInterval,
		agentStatus: AgentStatus{
			State:       EndpointStateOffline,
			ConnectedAt: time.Unix(0, 0),
			LastError:   "",
			Latency:     0,
		},
		endpointStatus:     make(map[string]EndpointStatus),
		endpointForwarders: make(map[string]ngrok.EndpointForwarder),
		endpointCancels:    make(map[string]context.CancelFunc),
		endpointConfigs:    make(map[string]string),
		triggerChan:        make(chan struct{}, 1), // buffered to prevent blocking
	}

	// Start converge loop if interval > 0
	if convergeInterval > 0 {
		m.startConvergeLoop()
	}

	return m
}

func (m *manager) Converge(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	// load state
	state, err := m.Store.Load()
	if err != nil {
		return err
	}
	// Handle agent configuration
	if err := m.convergeAgent(ctx, state.AgentConfig); err != nil {
		return err
	}
	// Handle endpoint configurations
	if err := m.convergeEndpoints(ctx, state.EndpointConfigs); err != nil {
		return err
	}
	return nil
}

func (m *manager) AgentStatus() AgentStatus {
	m.agentMu.RLock()
	defer m.agentMu.RUnlock()

	return m.agentStatus
}

func (m *manager) EndpointStatus() map[string]EndpointStatus {
	m.endpointMu.RLock()
	defer m.endpointMu.RUnlock()

	// Return a copy to avoid concurrent modification
	return maps.Clone(m.endpointStatus)
}

func (m *manager) Shutdown(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Stop converge loop if running
	if m.convergeCancel != nil {
		m.convergeCancel()
	}
	if m.convergeTicker != nil {
		m.convergeTicker.Stop()
	}

	m.disconnectAgent()
	return nil
}

// startConvergeLoop initializes and starts the converge loop
func (m *manager) startConvergeLoop() {
	m.convergeCtx, m.convergeCancel = context.WithCancel(context.Background())
	m.convergeTicker = time.NewTicker(m.convergeInterval)

	go m.convergeLoop()
}

// convergeLoop runs the periodic converge loop
func (m *manager) convergeLoop() {
	defer m.convergeTicker.Stop()

	for {
		select {
		case <-m.convergeCtx.Done():
			return
		case <-m.convergeTicker.C:
		case <-m.triggerChan:
		}

		// run converge
		if err := m.Converge(m.convergeCtx); err != nil {
			m.Logger.Error("converge failed", "error", err)
		}
	}
}

// triggerConverge forces immediate converge (unexported)
func (m *manager) triggerConverge() {
	select {
	case m.triggerChan <- struct{}{}:
	default: // channel full, converge already pending
	}
}

// CallNgrokEventHandlerForTests triggers the ngrok event handler for testing purposes
func (m *manager) CallNgrokEventHandlerForTests(event ngrok.Event) {
	m.handleAgentEvent(event)
}
