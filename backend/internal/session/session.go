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
	agent     ngrok.Agent
	authToken string
	cache     ProgressCache
	logger    *slog.Logger
}

// NewManager creates a new session manager
func NewManager(logger *slog.Logger) *Manager {
	return &Manager{
		cache: ProgressCache{
			Endpoints: make(map[string]Endpoint),
		},
		logger: logger,
	}
}

// StartNgrokSession starts a new ngrok session
func (m *Manager) StartNgrokSession() error {
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
	if m.agent == nil {
		if err := m.StartNgrokSession(); err != nil {
			return nil, err
		}
	}

	// Create upstream pointing to the Docker container
	upstream := ngrok.WithUpstream(fmt.Sprintf("http://172.17.0.1:%s", port))

	endpoint, err := m.agent.Forward(ctx, upstream)

	if err != nil {
		return nil, err
	}

	return endpoint, err
}

// SetAuthToken sets the authentication token and restarts the session if needed
func (m *Manager) SetAuthToken(token string) error {
	if token == m.authToken {
		return nil
	}

	m.authToken = token

	if m.agent != nil {
		m.logger.Info("Closing ngrok agent, new AuthToken")
		m.cache.Lock()
		// Close all endpoints before clearing the map
		for _, endpoint := range m.cache.Endpoints {
			endpoint.Endpoint.Close()
		}
		m.cache.Endpoints = make(map[string]Endpoint)
		m.cache.Unlock()

		m.agent.Disconnect()
		m.agent = nil
	}

	return m.StartNgrokSession()
}

type ProgressCache struct {
	sync.RWMutex
	Endpoints map[string]Endpoint // map of containers and active endpoints
}

type Endpoint struct {
	Endpoint    ngrok.EndpointForwarder
	EndpointID  string
	URL         string
}

// GetEndpoints returns a copy of the current endpoints map
func (m *Manager) GetEndpoints() map[string]Endpoint {
	m.cache.RLock()
	defer m.cache.RUnlock()

	// Return a copy to avoid race conditions
	result := make(map[string]Endpoint)
	for k, v := range m.cache.Endpoints {
		result[k] = v
	}
	return result
}

// AddEndpoint adds an endpoint to the cache
func (m *Manager) AddEndpoint(key string, endpointID, url string, endpoint ngrok.EndpointForwarder) {
	m.cache.Lock()
	defer m.cache.Unlock()

	m.cache.Endpoints[key] = Endpoint{
		Endpoint:   endpoint,
		EndpointID: endpointID,
		URL:        url,
	}
}

// RemoveEndpoint removes an endpoint from the cache and closes the endpoint
func (m *Manager) RemoveEndpoint(key string) map[string]Endpoint {
	m.cache.Lock()
	defer m.cache.Unlock()

	// Close the endpoint if it exists
	if endpoint, exists := m.cache.Endpoints[key]; exists {
		if endpoint.Endpoint != nil {
			endpoint.Endpoint.Close()
		}


	}

	delete(m.cache.Endpoints, key)

	// Return a copy of the remaining endpoints
	result := make(map[string]Endpoint)
	for k, v := range m.cache.Endpoints {
		result[k] = v
	}
	return result
}
