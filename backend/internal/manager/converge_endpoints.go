package manager

import (
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/url"
	"time"

	ngrok "golang.ngrok.com/ngrok/v2"

	"github.com/ngrok/ngrok-docker-extension/internal/detectproto"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func (m *manager) convergeEndpoints(ctx context.Context, endpointConfigs map[string]store.EndpointConfig) error {
	// Handle endpoints in the desired configuration
	for endpointID, config := range endpointConfigs {
		switch config.ExpectedState {
		case EndpointStateOnline:
			if err := m.handleEndpointOnlineState(ctx, endpointID, config); err != nil {
				return err
			}
		case EndpointStateOffline:
			m.handleEndpointOfflineState(endpointID)
		}
	}
	// Handle running endpoints not in desired config (remove them)
	for endpointID := range m.endpointForwarders {
		if _, exists := endpointConfigs[endpointID]; !exists {
			m.handleEndpointOfflineState(endpointID)
		}
	}
	return nil
}

// handleEndpointOnlineState manages creating/updating endpoints for online state
func (m *manager) handleEndpointOnlineState(ctx context.Context, endpointID string, config store.EndpointConfig) error {
	_, forwarderExists := m.endpointForwarders[endpointID]
	configChanged := m.endpointConfigChanged(endpointID, config)

	// Create/recreate endpoint if needed
	if !forwarderExists || configChanged {
		err := m.createOrUpdateEndpoint(ctx, endpointID, config, forwarderExists, configChanged)
		return err
	}
	return nil
}

// handleEndpointOfflineState manages removing endpoints for offline state
func (m *manager) handleEndpointOfflineState(endpointID string) {
	if forwarder, exists := m.endpointForwarders[endpointID]; exists {
		forwarder.Close()
		delete(m.endpointForwarders, endpointID)
	}
	delete(m.endpointConfigs, endpointID)
	m.setEndpointOffline(endpointID)
}

// endpointConfigChanged checks if endpoint configuration has changed
func (m *manager) endpointConfigChanged(endpointID string, config store.EndpointConfig) bool {
	currentConfigHash := m.computeConfigHash(config)
	lastConfigHash, configExists := m.endpointConfigs[endpointID]
	return !configExists || lastConfigHash != currentConfigHash
}

// createOrUpdateEndpoint handles the creation or recreation of an endpoint
func (m *manager) createOrUpdateEndpoint(ctx context.Context, endpointID string, config store.EndpointConfig, forwarderExists, configChanged bool) error {
	// Close existing forwarder if config changed
	if forwarderExists && configChanged {
		if forwarder, exists := m.endpointForwarders[endpointID]; exists {
			forwarder.Close()
			delete(m.endpointForwarders, endpointID)
		}
	}

	if m.agent == nil {
		m.setEndpointStarting(endpointID, "waiting for connection to ngrok cloud")
		return nil
	}

	m.setEndpointStarting(endpointID, "")

	ch := make(chan struct{})
	go func() {
		defer close(ch)
		// Create the forwarder
		forwarder, err := m.createEndpointForwarder(ctx, config)
		if err != nil {
			m.setEndpointFailed(endpointID, fmt.Sprintf("failed to create endpoint: %v", err))
			return
		}

		// Store forwarder and config hash
		m.endpointForwarders[endpointID] = forwarder
		m.endpointConfigs[endpointID] = m.computeConfigHash(config)

		// Set endpoint status
		m.setEndpointOnline(endpointID, forwarder)
	}()
	select {
	case <-ch:
	case <-time.After(time.Second):
	}
	return nil
}

// createEndpointForwarder creates a new endpoint forwarder
func (m *manager) createEndpointForwarder(ctx context.Context, config store.EndpointConfig) (ngrok.EndpointForwarder, error) {
	// Create upstream and options
	upstream := m.buildUpstream(ctx, config)
	var opts []ngrok.EndpointOption
	if config.URL != "" {
		opts = append(opts, ngrok.WithURL(config.URL))
	}
	if config.Binding != "" {
		opts = append(opts, ngrok.WithBindings(config.Binding))
	}
	if config.TrafficPolicy != "" {
		opts = append(opts, ngrok.WithTrafficPolicy(config.TrafficPolicy))
	}
	if config.Description != "" {
		opts = append(opts, ngrok.WithDescription(config.Description))
	}
	if config.Metadata != "" {
		opts = append(opts, ngrok.WithMetadata(config.Metadata))
	}
	opts = append(opts, ngrok.WithPoolingEnabled(config.PoolingEnabled))

	// Create the forwarder using agent context
	return m.agent.Forward(m.agentCtx, upstream, opts...)
}

// buildUpstream constructs the upstream URL for connecting to the container
// Uses protocol detection to determine if TLS schemes should be applied
func (m *manager) buildUpstream(ctx context.Context, config store.EndpointConfig) *ngrok.Upstream {
	host := "172.17.0.1"
	port := config.TargetPort

	// Detect protocols on the target port
	detectCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	result, err := m.ProtocolDetector.Detect(detectCtx, host, port)
	if err != nil {
		result = &detectproto.Result{}
	}

	// Parse the endpoint URL to get its scheme
	var endpointScheme string
	if config.URL != "" {
		if parsedURL, err := url.Parse(config.URL); err == nil {
			endpointScheme = parsedURL.Scheme
		}
	}

	var upstreamScheme string
	var opts []ngrok.UpstreamOption

	// Apply TLS-based upstream scheme logic
	// If TLS is detected and endpoint scheme is http/https (or no scheme), use https:// upstream
	switch endpointScheme {
	case "http", "https", "":
		if result.TLS {
			upstreamScheme = "https"
		} else {
			upstreamScheme = "http"
		}
	default:
		upstreamScheme = endpointScheme
	}

	// most local containers won't have valid TLS certificates and the
	// connection is only transiting over docker's host-local interface. we can
	// add user-configuration for this in the future
	opts = append(opts, ngrok.WithUpstreamTLSClientConfig(&tls.Config{InsecureSkipVerify: true}))

	return ngrok.WithUpstream(
		fmt.Sprintf("%s://%s:%s", upstreamScheme, host, port),
		opts...,
	)
}

// setEndpointOffline sets an endpoint status to offline with optional error
func (m *manager) setEndpointOffline(endpointID string) {
	m.endpointMu.Lock()
	defer m.endpointMu.Unlock()

	m.endpointStatus[endpointID] = EndpointStatus{
		State: EndpointStateOffline,
	}
}

// setEndpointStarting sets an endpoint status that indicates it's trying to
// start
func (m *manager) setEndpointStarting(endpointID string, lastError string) {
	m.endpointMu.Lock()
	defer m.endpointMu.Unlock()

	m.endpointStatus[endpointID] = EndpointStatus{
		State:     EndpointStateStarting,
		LastError: lastError,
	}
}

func (m *manager) setEndpointsAgentDisconnected() {
	m.endpointMu.Lock()
	defer m.endpointMu.Unlock()

	for id, status := range m.endpointStatus {
		if status.State == EndpointStateOnline {
			m.endpointStatus[id] = EndpointStatus{
				State:     EndpointStateStarting,
				LastError: "agent disconnected",
				URL:       status.URL,
			}
		}
	}
}

func (m *manager) setEndpointsAgentConnected() {
	m.endpointMu.Lock()
	defer m.endpointMu.Unlock()

	for id, status := range m.endpointStatus {
		if status.State == EndpointStateStarting && status.LastError == "agent disconnected" {
			m.endpointStatus[id] = EndpointStatus{
				State: EndpointStateOnline,
				URL:   status.URL,
			}
		}
	}
}

// setEndpointFailed sets an endpoint status that indicates the call to
// Forward() failed
func (m *manager) setEndpointFailed(endpointID string, lastError string) {
	m.endpointMu.Lock()
	defer m.endpointMu.Unlock()

	m.endpointStatus[endpointID] = EndpointStatus{
		State:     EndpointStateFailed,
		LastError: lastError,
	}
}

// setEndpointOnline sets the endpoint status to online with appropriate error handling
func (m *manager) setEndpointOnline(endpointID string, forwarder ngrok.EndpointForwarder) {
	m.endpointMu.Lock()
	defer m.endpointMu.Unlock()

	status := EndpointStatus{
		URL:   forwarder.URL().String(),
		State: EndpointStateOnline,
	}

	m.endpointStatus[endpointID] = status
}

// computeConfigHash computes a hash of endpoint configuration for change detection
func (m *manager) computeConfigHash(config store.EndpointConfig) string {
	// Only hash fields that affect the ngrok endpoint
	configData := map[string]interface{}{
		"url":            config.URL,
		"binding":        config.Binding,
		"poolingEnabled": config.PoolingEnabled,
		"trafficPolicy":  config.TrafficPolicy,
		"metadata":       config.Metadata,
		"description":    config.Description,
		"targetPort":     config.TargetPort,
	}

	data, _ := json.Marshal(configData)
	hash := sha256.Sum256(data)
	return fmt.Sprintf("%x", hash)
}
