package session

import (
	"context"
	"fmt"
	"log/slog"
	"sync"

	"golang.ngrok.com/ngrok/v2"
)

// Manager manages ngrok sessions and endpoints
type Manager struct {
	mu        sync.RWMutex // protects all manager state
	agent     ngrok.Agent
	authToken string
	endpoints map[string]Endpoint // map of containers and active endpoints
	logger    *slog.Logger
}

// NewManager creates a new session manager
func NewManager(logger *slog.Logger) *Manager {
	return &Manager{
		endpoints: make(map[string]Endpoint),
		logger:    logger,
	}
}

// StartNgrokSession starts a new ngrok session
func (m *Manager) StartNgrokSession() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.agent != nil {
		return nil
	}

	m.logger.Info("Starting ngrok agent")

	agent, err := ngrok.NewAgent(
		ngrok.WithAuthtoken(m.authToken),
		ngrok.WithLogger(m.logger),
		ngrok.WithEventHandler(func(event ngrok.Event) {
			switch e := event.(type) {
			case *ngrok.EventAgentConnectSucceeded:
				m.logger.Info("Connected to ngrok server")
			case *ngrok.EventAgentDisconnected:
				m.logger.Info("Disconnected from ngrok server")
				if e.Error != nil {
					m.logger.Error("Disconnect error", "error", e.Error)
				}
			}
		}),
	)
	if err != nil {
		m.logger.Error("Failed to create ngrok agent", "error", err)
		return fmt.Errorf("failed to create ngrok agent: %w", err)
	}

	m.agent = agent
	return nil
}

// StartEndpoint starts a new endpoint for the specified port
func (m *Manager) StartEndpoint(ctx context.Context, port string) (ngrok.EndpointForwarder, error) {
	// Check if agent exists and create if needed
	m.mu.RLock()
	needsAgent := m.agent == nil
	m.mu.RUnlock()

	if needsAgent {
		if err := m.StartNgrokSession(); err != nil {
			return nil, err
		}
	}

	// Use agent to create endpoint (protected by read lock)
	m.mu.RLock()
	agent := m.agent
	m.mu.RUnlock()

	if agent == nil {
		return nil, fmt.Errorf("ngrok agent not available")
	}

	// Create upstream pointing to the Docker container
	upstream := ngrok.WithUpstream(fmt.Sprintf("http://172.17.0.1:%s", port))

	endpoint, err := agent.Forward(context.Background(), upstream)

	if err != nil {
		return nil, err
	}

	return endpoint, err
}

// closeSession closes the current ngrok session and cleans up all endpoints
// Must be called with mutex held
func (m *Manager) closeSession() {
	if m.agent == nil {
		return
	}

	m.logger.Info("Closing ngrok session")

	// Close all endpoints before clearing the map
	for _, endpoint := range m.endpoints {
		endpoint.Endpoint.Close()
	}
	m.endpoints = make(map[string]Endpoint)

	// Disconnect and clear agent
	m.agent.Disconnect()
	m.agent = nil
}

// SetAuthToken sets the authentication token and restarts the session if needed
func (m *Manager) SetAuthToken(token string) error {
	m.mu.Lock()
	if token == m.authToken {
		m.mu.Unlock()
		return nil
	}

	m.authToken = token
	m.closeSession()
	m.mu.Unlock()

	return m.StartNgrokSession()
}

// Shutdown gracefully shuts down the session manager
func (m *Manager) Shutdown() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.closeSession()
}

type Endpoint struct {
	Endpoint   ngrok.EndpointForwarder
	EndpointID string
	URL        string
}

// GetEndpoints returns a copy of the current endpoints map
func (m *Manager) GetEndpoints() map[string]Endpoint {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Return a copy to avoid race conditions
	result := make(map[string]Endpoint)
	for k, v := range m.endpoints {
		result[k] = v
	}
	return result
}

// AddEndpoint adds an endpoint to the endpoints map
func (m *Manager) AddEndpoint(key string, endpointID, url string, endpoint ngrok.EndpointForwarder) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.endpoints[key] = Endpoint{
		Endpoint:   endpoint,
		EndpointID: endpointID,
		URL:        url,
	}
}

// RemoveEndpoint removes an endpoint from the endpoints map and closes the endpoint
func (m *Manager) RemoveEndpoint(key string) map[string]Endpoint {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Close the endpoint if it exists
	if endpoint, exists := m.endpoints[key]; exists {
		if endpoint.Endpoint != nil {
			endpoint.Endpoint.Close()
		}
	}

	delete(m.endpoints, key)

	// Return a copy of the remaining endpoints
	result := make(map[string]Endpoint)
	for k, v := range m.endpoints {
		result[k] = v
	}
	return result
}
