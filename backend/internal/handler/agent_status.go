package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func (h *Handler) GetAgentStatus(c echo.Context) error {
	agentStatus := h.endpointManager.GetCurrentStatus()

	latencyMs := agentStatus.ConnectionLatency.Milliseconds()

	var lastError string
	if agentStatus.LastError != nil {
		lastError = agentStatus.LastError.Error()
	}

	response := AgentStatusResponse{
		Status:            string(agentStatus.Status),
		Timestamp:         agentStatus.Timestamp.Format("2006-01-02T15:04:05Z07:00"),
		ConnectionLatency: latencyMs,
		LastError:         lastError,
	}

	return c.JSON(http.StatusOK, response)
}
