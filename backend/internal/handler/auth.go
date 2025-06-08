package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func (h *Handler) SetupAuth(ctx echo.Context) error {
	h.logger.Info("Setting up ngrok auth token")
	
	var req AuthRequest
	if err := ctx.Bind(&req); err != nil {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid request format"})
	}
	
	if req.Token == "" {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "token is required"})
	}

	if err := h.sessionManager.SetAuthToken(req.Token); err != nil {
		h.logger.Error("Failed to set auth token", "error", err)
		return ctx.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Invalid authentication token"})
	}

	return ctx.JSON(http.StatusOK, AuthResponse{})
}
