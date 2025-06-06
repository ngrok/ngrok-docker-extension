package session

import (
	"context"
	"fmt"
	"log/slog"
	"sync"

	"golang.ngrok.com/ngrok/v2"
)

// Manager manages ngrok sessions and tunnels
type Manager struct {
	agent     ngrok.Agent
	authToken string
	tunnels   []ngrok.EndpointForwarder
	cache     ProgressCache
	logger    *slog.Logger
}

// NewManager creates a new session manager
func NewManager(logger *slog.Logger) *Manager {
	return &Manager{
		tunnels: make([]ngrok.EndpointForwarder, 0),
		cache: ProgressCache{
			Tunnels: make(map[string]Tunnel),
		},
		logger: logger,
	}
}

// StartNgrokSession starts a new ngrok session
func (m *Manager) StartNgrokSession() {
	if m.agent != nil {
		return
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
		return
	}

	m.agent = agent
}

// StartTunnel starts a new tunnel for the specified port
func (m *Manager) StartTunnel(ctx context.Context, port string) (ngrok.EndpointForwarder, error) {
	if m.agent == nil {
		m.StartNgrokSession()
	}

	if m.agent == nil {
		return nil, fmt.Errorf("failed to create ngrok agent")
	}

	// Create upstream pointing to the Docker container
	upstream := ngrok.WithUpstream(fmt.Sprintf("http://172.17.0.1:%s", port))

	endpoint, err := m.agent.Forward(ctx, upstream)

	if err != nil {
		return nil, err
	}

	// Add to tunnels slice for proper tracking
	m.tunnels = append(m.tunnels, endpoint)

	return endpoint, err
}

// SetAuthToken sets the authentication token and restarts the session if needed
func (m *Manager) SetAuthToken(token string) {
	if token == m.authToken {
		return
	}

	m.authToken = token

	if m.agent != nil {
		m.logger.Info("Closing ngrok agent, new AuthToken")
		m.cache.Lock()
		m.cache.Tunnels = make(map[string]Tunnel)
		m.cache.Unlock()

		for _, endpoint := range m.tunnels {
			endpoint.Close()
		}
		m.tunnels = nil

		m.agent.Disconnect()
		m.agent = nil
	}

	m.StartNgrokSession()
}

type ProgressCache struct {
	sync.RWMutex
	Tunnels map[string]Tunnel // map of containers and active tunnels
}

type Tunnel struct {
	Endpoint ngrok.EndpointForwarder
	TunnelID string
	URL      string
}

// GetTunnels returns a copy of the current tunnels map
func (m *Manager) GetTunnels() map[string]Tunnel {
	m.cache.RLock()
	defer m.cache.RUnlock()

	// Return a copy to avoid race conditions
	result := make(map[string]Tunnel)
	for k, v := range m.cache.Tunnels {
		result[k] = v
	}
	return result
}

// AddTunnel adds a tunnel to the cache
func (m *Manager) AddTunnel(key string, tunnelID, url string, endpoint ngrok.EndpointForwarder) {
	m.cache.Lock()
	defer m.cache.Unlock()

	m.cache.Tunnels[key] = Tunnel{
		Endpoint: endpoint,
		TunnelID: tunnelID,
		URL:      url,
	}
}

// RemoveTunnel removes a tunnel from the cache and closes the endpoint
func (m *Manager) RemoveTunnel(key string) map[string]Tunnel {
	m.cache.Lock()
	defer m.cache.Unlock()

	// Close the endpoint if it exists
	if tunnel, exists := m.cache.Tunnels[key]; exists {
		if tunnel.Endpoint != nil {
			tunnel.Endpoint.Close()
		}

		// Also remove from tunnels slice
		for i, endpoint := range m.tunnels {
			if endpoint == tunnel.Endpoint {
				m.tunnels = append(m.tunnels[:i], m.tunnels[i+1:]...)
				break
			}
		}
	}

	delete(m.cache.Tunnels, key)

	// Return a copy of the remaining tunnels
	result := make(map[string]Tunnel)
	for k, v := range m.cache.Tunnels {
		result[k] = v
	}
	return result
}
