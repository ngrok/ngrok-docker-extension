package endpoint

import (
	"context"
	"crypto/tls"
	"fmt"
	"log/slog"
	"os"
	"sync"
	"time"

	"maps"

	"github.com/ngrok/ngrok-docker-extension/internal/detectproto"
	"golang.ngrok.com/ngrok/v2"
)

// makeEndpointKey creates a composite key for endpoint storage
func makeEndpointKey(containerID, targetPort string) string {
	return fmt.Sprintf("%s:%s", containerID, targetPort)
}

// Endpoint represents an active ngrok endpoint forwarding to a container
type Endpoint struct {
	Forwarder   ngrok.EndpointForwarder
	ContainerID string
	TargetPort  string
}

// Manager manages ngrok endpoints for Docker containers
type Manager interface {
	ConfigureAgent(ctx context.Context, opts ...ngrok.AgentOption) error
	CreateEndpoint(ctx context.Context, containerID, targetPort string, opts ...ngrok.EndpointOption) (*Endpoint, error)
	RemoveEndpoint(ctx context.Context, containerID, targetPort string) error
	ListEndpoints() map[string]*Endpoint
	Shutdown(ctx context.Context) error
}

// manager implements the Manager interface
type manager struct {
	mu        sync.RWMutex
	agent     ngrok.Agent
	endpoints map[string]*Endpoint // containerID:targetPort -> endpoint
	logger    *slog.Logger
}

// NewManager creates a new endpoint manager
func NewManager(logger *slog.Logger) Manager {
	return &manager{
		endpoints: make(map[string]*Endpoint),
		logger:    logger,
	}
}

// ConfigureAgent configures a new ngrok agent with the provided options
func (m *manager) ConfigureAgent(ctx context.Context, opts ...ngrok.AgentOption) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Close existing agent if present
	if err := m.closeAgent(ctx); err != nil {
		m.logger.Warn("Error closing existing agent", "error", err)
	}

	m.logger.Info("Configuring ngrok agent")

	// Get version from environment
	version := os.Getenv("EXTENSION_VERSION")
	if version == "" {
		version = "unknown"
	}

	// Add manager's own logger, client info, and event handler to the options
	agentOpts := append(opts,
		ngrok.WithClientInfo("ngrok-docker-desktop-extension", version),
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
		}))

	agent, err := ngrok.NewAgent(agentOpts...)
	if err != nil {
		m.logger.Error("Failed to create ngrok agent", "error", err)
		return fmt.Errorf("failed to create ngrok agent: %w", err)
	}

	m.agent = agent
	return nil
}

// CreateEndpoint creates a new ngrok endpoint for the specified container and target port
func (m *manager) CreateEndpoint(ctx context.Context, containerID, targetPort string, opts ...ngrok.EndpointOption) (*Endpoint, error) {
	if containerID == "" {
		return nil, fmt.Errorf("containerID cannot be empty")
	}
	if targetPort == "" {
		return nil, fmt.Errorf("targetPort cannot be empty")
	}

	// Ensure agent exists
	m.mu.RLock()
	agent := m.agent
	m.mu.RUnlock()

	if agent == nil {
		return nil, fmt.Errorf("no agent configured - call ConfigureAgent first")
	}

	// Detect protocols on the port with 250ms timeout
	detectCtx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond)
	defer cancel()

	detection, err := detectproto.Detect(detectCtx, "172.17.0.1", targetPort)
	if err != nil {
		m.logger.Warn("Protocol detection failed, using default",
			"error", err,
			"containerID", containerID,
			"targetPort", targetPort,
			"upstream", "http",
		)
	} else {
		m.logger.Info("Protocol detection complete",
			"containerID", containerID,
			"targetPort", targetPort,
			"detected", fmt.Sprintf("tcp:%v http:%v https:%v tls:%v",
				detection.TCP, detection.HTTP, detection.HTTPS, detection.TLS),
			"upstream", "https")
	}

	// Create upstream and log based on detection results
	var upstream *ngrok.Upstream

	switch {
	case detection != nil && detection.HTTPS:
		// Service requires TLS - configure upstream with TLS and skip certificate verification
		tlsConfig := &tls.Config{
			InsecureSkipVerify: true,
			ServerName:         "172.17.0.1",
		}
		upstream = ngrok.WithUpstream(fmt.Sprintf("https://172.17.0.1:%s", targetPort),
			ngrok.WithUpstreamTLSClientConfig(tlsConfig))
	case detection != nil:
		// Default to HTTP upstream (covers HTTP, TCP, TLS cases)
		upstream = ngrok.WithUpstream(fmt.Sprintf("http://172.17.0.1:%s", targetPort))
	default:
		// Detection failed - fallback to HTTP upstream
		upstream = ngrok.WithUpstream(fmt.Sprintf("http://172.17.0.1:%s", targetPort))
	}

	// Always create HTTPS endpoint - prepend HTTPS URL option to user opts
	forwarder, err := agent.Forward(context.Background(), upstream, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create endpoint: %w", err)
	}

	endpoint := &Endpoint{
		Forwarder:   forwarder,
		ContainerID: containerID,
		TargetPort:  targetPort,
	}

	// Store the endpoint using composite key
	endpointKey := makeEndpointKey(containerID, targetPort)
	m.mu.Lock()
	m.endpoints[endpointKey] = endpoint
	m.mu.Unlock()

	m.logger.Info("Endpoint created",
		"containerID", containerID,
		"targetPort", targetPort,
		"url", forwarder.URL().String(),
		"endpointID", forwarder.ID())

	return endpoint, nil
}

// RemoveEndpoint removes and closes an endpoint for the specified container and target port
func (m *manager) RemoveEndpoint(ctx context.Context, containerID, targetPort string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	endpointKey := makeEndpointKey(containerID, targetPort)
	endpoint, exists := m.endpoints[endpointKey]
	if !exists {
		return fmt.Errorf("no endpoint found for container %s on target port %s", containerID, targetPort)
	}

	// Close the endpoint
	if endpoint.Forwarder != nil {
		if err := endpoint.Forwarder.Close(); err != nil {
			return err
		}
	}

	delete(m.endpoints, endpointKey)

	m.logger.Info("Endpoint removed", "containerID", containerID, "targetPort", targetPort)
	return nil
}

// ListEndpoints returns a copy of all active endpoints
func (m *manager) ListEndpoints() map[string]*Endpoint {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Return a copy to avoid race conditions
	result := make(map[string]*Endpoint)
	maps.Copy(result, m.endpoints)
	return result
}

// Shutdown gracefully shuts down the manager, closing all endpoints and the agent
func (m *manager) Shutdown(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.logger.Info("Shutting down endpoint manager")
	return m.closeAgent(ctx)
}

// closeAgent closes the current agent and cleans up
// Must be called with the mutex held
func (m *manager) closeAgent(_ context.Context) error {
	if m.agent == nil {
		return nil
	}

	m.logger.Info("Closing ngrok agent")

	// Disconnect agent (this automatically closes all endpoints)
	m.agent.Disconnect()
	m.agent = nil

	// Clear endpoints map since they're all closed
	m.endpoints = make(map[string]*Endpoint)

	return nil
}
