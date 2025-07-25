package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

// AgentResponse combines config and runtime state for API
type AgentResponse struct {
	AuthToken     string              `json:"authToken"`
	ConnectURL    string              `json:"connectURL,omitempty"`
	ExpectedState string              `json:"expectedState"`
	Status        manager.AgentStatus `json:"status"`
}

func (h *Handler) PutAgent(c echo.Context) error {

	// Parse request
	var config store.AgentConfig
	if err := c.Bind(&config); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	// Update the agent configuration
	if err := h.Store.Update(func(state *store.State) error {
		state.AgentConfig = config

		// if you explicitly set the agent to be offline, we set all endpoints
		// to be offline
		if config.ExpectedState == manager.AgentStateOffline {
			for id, cfg := range state.EndpointConfigs {
				cfg.ExpectedState = manager.EndpointStateOffline
				state.EndpointConfigs[id] = cfg
			}
		}

		return nil
	}); err != nil {
		return h.internalServerError(c, "Failed to save configuration")
	}

	// Trigger convergence to apply the configuration
	if err := h.Manager.Converge(c.Request().Context()); err != nil {
		h.logger.Warn("convergence failed", "err", err)
	}

	// Build and return agent response
	return h.buildAgentResponse(c)
}

func (h *Handler) GetAgent(c echo.Context) error {
	// Build and return agent response
	response := h.buildAgentResponse(c)

	return response
}

// buildAgentResponse creates an AgentResponse by combining store config and manager status
func (h *Handler) buildAgentResponse(c echo.Context) error {
	// Load configuration from store
	state, err := h.Store.Load()
	if err != nil {
		return h.internalServerError(c, "Failed to load configuration")
	}

	// Get current runtime status
	agentStatus := h.Manager.AgentStatus()

	// Build response combining configuration and runtime status
	response := AgentResponse{
		AuthToken:     state.AgentConfig.AuthToken,
		ConnectURL:    state.AgentConfig.ConnectURL,
		ExpectedState: state.AgentConfig.ExpectedState,
		Status:        agentStatus,
	}

	return c.JSON(http.StatusOK, response)
}
