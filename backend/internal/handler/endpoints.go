package handler

import (
	"errors"
	"fmt"
	"maps"
	"net/http"
	"slices"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

var errEndpointNotFound = errors.New("endpoint not found")

// GET /endpoints Types (new state management)
type GetEndpointsResponse struct {
	Endpoints []EndpointResponse `json:"endpoints"`
}

// EndpointResponse combines config and runtime state for API
type EndpointResponse struct {
	// Configuration fields (from persistent store)
	ID             string `json:"id"`
	ContainerID    string `json:"containerId"`
	TargetPort     string `json:"targetPort"`
	URL            string `json:"url,omitempty"`
	Binding        string `json:"binding,omitempty"`
	PoolingEnabled bool   `json:"poolingEnabled"`
	TrafficPolicy  string `json:"trafficPolicy,omitempty"`
	Description    string `json:"description,omitempty"`
	Metadata       string `json:"metadata,omitempty"`
	ExpectedState  string `json:"expectedState"`
	LastStarted    string `json:"lastStarted,omitempty"`

	// Runtime state (from endpoint manager)
	Status manager.EndpointStatus `json:"status"`
}

// EndpointRequest defines the request body for POST /endpoints and PUT /endpoints/:id
type EndpointRequest struct {
	ContainerID    string `json:"containerId"`
	TargetPort     string `json:"targetPort"`
	URL            string `json:"url,omitempty"`
	Binding        string `json:"binding,omitempty"`
	PoolingEnabled bool   `json:"poolingEnabled,omitempty"`
	TrafficPolicy  string `json:"trafficPolicy,omitempty"`
	Description    string `json:"description,omitempty"`
	Metadata       string `json:"metadata,omitempty"`
	ExpectedState  string `json:"expectedState"`
}

func (h *Handler) PostEndpoints(c echo.Context) error {
	// Parse request
	var req EndpointRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	// Validate required fields
	if err := h.validateEndpointRequest(c, req.ContainerID, req.TargetPort, req.ExpectedState); err != nil {
		return err
	}

	// Create endpoint ID as containerID:targetPort
	endpointID := fmt.Sprintf("%s:%s", req.ContainerID, req.TargetPort)

	// Update state atomically
	if err := h.updateEndpointConfigInStore(endpointID, req); err != nil {
		return h.internalServerError(c, "Failed to save endpoint configuration")
	}

	// Trigger convergence to apply the configuration
	if err := h.Manager.Converge(c.Request().Context()); err != nil {
		h.logger.Warn("convergence failed", "err", err)
	}

	// Get endpoint response using shared helper
	endpoint, err := h.buildEndpointResponse(endpointID)
	if err != nil {
		return h.internalServerError(c, err.Error())
	}

	return c.JSON(http.StatusCreated, endpoint)
}

func (h *Handler) GetEndpoints(c echo.Context) error {
	// Load configuration from store
	state, err := h.Store.Load()
	if err != nil {
		return h.internalServerError(c, "Failed to load configuration")
	}

	// Get current runtime status from manager
	endpointStatuses := h.Manager.EndpointStatus()

	// Log the endpoint statuses for debugging

	// Build response combining configuration and runtime status using slices
	endpoints := slices.Collect(func(yield func(EndpointResponse) bool) {
		for config := range maps.Values(state.EndpointConfigs) {
			endpoint := h.buildEndpointResponseNoLoad(config, endpointStatuses)

			if !yield(endpoint) {
				return
			}
		}
	})

	// Ensure endpoints is never nil
	if endpoints == nil {
		endpoints = []EndpointResponse{}
	}

	response := GetEndpointsResponse{
		Endpoints: endpoints,
	}

	return c.JSON(http.StatusOK, response)
}

func (h *Handler) GetEndpointByID(c echo.Context) error {
	// Get endpoint ID from URL parameter
	endpointID := c.Param("id")
	if endpointID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "endpoint ID is required"})
	}

	// Get endpoint response using shared helper
	endpoint, err := h.buildEndpointResponse(endpointID)
	if err != nil {
		if errors.Is(err, errEndpointNotFound) {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Endpoint not found"})
		}
		return h.internalServerError(c, err.Error())
	}

	return c.JSON(http.StatusOK, endpoint)
}

func (h *Handler) PutEndpointByID(c echo.Context) error {
	// Get endpoint ID from URL parameter
	endpointID := c.Param("id")
	if endpointID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "endpoint ID is required"})
	}

	// Parse request body
	var req EndpointRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	// Validate required fields
	if err := h.validateEndpointRequest(c, req.ContainerID, req.TargetPort, req.ExpectedState); err != nil {
		return err
	}

	// Verify that the endpoint ID matches containerID:targetPort
	expectedID := fmt.Sprintf("%s:%s", req.ContainerID, req.TargetPort)
	if endpointID != expectedID {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "endpoint ID must match containerId:targetPort"})
	}

	// Update endpoint configuration
	if err := h.updateEndpointConfigInStore(endpointID, req); err != nil {
		return h.internalServerError(c, "Failed to save endpoint configuration")
	}

	// Trigger convergence to apply the configuration
	if err := h.Manager.Converge(c.Request().Context()); err != nil {
		h.logger.Warn("convergence failed", "err", err)
	}

	// Get endpoint response using shared helper
	endpoint, err := h.buildEndpointResponse(endpointID)
	if err != nil {
		return h.internalServerError(c, err.Error())
	}

	return c.JSON(http.StatusOK, endpoint)
}

func (h *Handler) DeleteEndpointByID(c echo.Context) error {
	// Get endpoint ID from URL parameter
	endpointID := c.Param("id")
	if endpointID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "endpoint ID is required"})
	}

	// Update state atomically to remove the endpoint
	err := h.Store.Update(func(state *store.State) error {
		// Check if endpoint exists
		if state.EndpointConfigs == nil {
			return errEndpointNotFound
		}

		_, exists := state.EndpointConfigs[endpointID]
		if !exists {
			return errEndpointNotFound
		}

		// Remove the endpoint configuration
		delete(state.EndpointConfigs, endpointID)

		return nil
	})
	if err != nil {
		if errors.Is(err, errEndpointNotFound) {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Endpoint not found"})
		}
		return h.internalServerError(c, "Failed to remove endpoint configuration")
	}

	// Trigger convergence to stop the endpoint if it's running
	if err := h.Manager.Converge(c.Request().Context()); err != nil {
		h.logger.Warn("convergence failed", "err", err)
	}

	// Return 204 No Content for successful deletion
	return c.NoContent(http.StatusNoContent)
}

// Helper functions

// updateEndpointConfigInStore creates/updates endpoint configuration in store
func (h *Handler) updateEndpointConfigInStore(endpointID string, req EndpointRequest) error {
	return h.Store.Update(func(state *store.State) error {
		// Initialize EndpointConfigs map if nil
		if state.EndpointConfigs == nil {
			state.EndpointConfigs = make(map[string]store.EndpointConfig)
		}

		// Get existing config to preserve LastStarted field
		existingConfig, exists := state.EndpointConfigs[endpointID]

		// Create endpoint configuration
		endpointConfig := store.EndpointConfig{
			ID:             endpointID,
			ContainerID:    req.ContainerID,
			TargetPort:     req.TargetPort,
			ExpectedState:  req.ExpectedState,
			URL:            req.URL,
			Binding:        req.Binding,
			PoolingEnabled: req.PoolingEnabled,
			TrafficPolicy:  req.TrafficPolicy,
			Description:    req.Description,
			Metadata:       req.Metadata,
		}

		// Handle LastStarted field
		if req.ExpectedState == manager.EndpointStateOnline {
			// Set LastStarted to current time when going online
			endpointConfig.LastStarted = time.Now().Format(time.RFC3339)
		} else if exists {
			// Preserve existing LastStarted value when going offline
			endpointConfig.LastStarted = existingConfig.LastStarted
		}

		// Store the endpoint configuration
		state.EndpointConfigs[endpointID] = endpointConfig

		// Ensure agent is set to online when endpoints with expectedState=online are created/updated
		if endpointConfig.ExpectedState == manager.EndpointStateOnline {
			state.AgentConfig.ExpectedState = manager.EndpointStateOnline
		}

		return nil
	})
}

// validateEndpointRequest validates required fields for endpoint requests
func (h *Handler) validateEndpointRequest(c echo.Context, containerID, targetPort, expectedState string) error {
	if containerID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "containerId is required"})
	}
	if targetPort == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "targetPort is required"})
	}
	if expectedState == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "expectedState is required"})
	}
	if expectedState != manager.EndpointStateOnline && expectedState != manager.EndpointStateOffline {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "expectedState must be 'online' or 'offline'"})
	}
	return nil
}

// getEndpointResponse loads state, finds endpoint config, and builds response
func (h *Handler) buildEndpointResponse(endpointID string) (EndpointResponse, error) {
	// Load configuration from store
	state, err := h.Store.Load()
	if err != nil {
		return EndpointResponse{}, fmt.Errorf("failed to load configuration: %w", err)
	}

	// Find the endpoint configuration
	config, exists := state.EndpointConfigs[endpointID]
	if !exists {
		return EndpointResponse{}, errEndpointNotFound
	}

	// Get current runtime status from manager
	endpointStatuses := h.Manager.EndpointStatus()

	// Build response combining configuration and runtime status
	endpoint := h.buildEndpointResponseNoLoad(config, endpointStatuses)

	return endpoint, nil
}

// buildEndpointResponseFragment creates an EndpointResponse without loading
// state or consulting the manager
func (h *Handler) buildEndpointResponseNoLoad(config store.EndpointConfig, endpointStatuses map[string]manager.EndpointStatus) EndpointResponse {
	// Get runtime status for this endpoint
	status, exists := endpointStatuses[config.ID]
	if !exists {
		// No runtime status available, create default offline status
		status = manager.EndpointStatus{
			State:     manager.EndpointStateOffline,
			LastError: "",
		}
	}

	return EndpointResponse{
		ID:             config.ID,
		ContainerID:    config.ContainerID,
		TargetPort:     config.TargetPort,
		URL:            config.URL,
		Binding:        config.Binding,
		PoolingEnabled: config.PoolingEnabled,
		TrafficPolicy:  config.TrafficPolicy,
		Description:    config.Description,
		Metadata:       config.Metadata,
		ExpectedState:  config.ExpectedState,
		LastStarted:    config.LastStarted,
		Status:         status,
	}
}
