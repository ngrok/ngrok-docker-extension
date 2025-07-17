package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"golang.ngrok.com/ngrok/v2"
)

func (h *Handler) ConfigureAgent(ctx echo.Context) error {
	h.logger.Info("Configuring ngrok agent with auth token")
	
	var req ConfigureAgentRequest
	if err := ctx.Bind(&req); err != nil {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid request format"})
	}
	
	if req.Token == "" {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "token is required"})
	}

	// Build agent options
	agentOpts := []ngrok.AgentOption{ngrok.WithAuthtoken(req.Token)}
	if req.ConnectURL != "" {
		agentOpts = append(agentOpts, ngrok.WithAgentConnectURL(req.ConnectURL))
	}

	// Default auto-disconnect to false if not specified
	autoDisconnect := false
	if req.AutoDisconnect != nil {
		autoDisconnect = *req.AutoDisconnect
	}

	if err := h.endpointManager.ConfigureAgent(ctx.Request().Context(), autoDisconnect, agentOpts...); err != nil {
		h.logger.Error("Failed to configure agent", "error", err, "connectURL", req.ConnectURL, "autoDisconnect", autoDisconnect)
		return ctx.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Invalid agent configuration"})
	}

	return ctx.JSON(http.StatusOK, ConfigureAgentResponse{})
}
