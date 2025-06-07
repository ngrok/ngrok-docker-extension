package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func (h *Handler) SetupAuth(ctx echo.Context) error {
	h.logger.Info("Setting up ngrok auth token")
	token := ctx.QueryParam("token")
	if token == "" {
		return ctx.String(http.StatusBadRequest, "token is required")
	}

	if err := h.sessionManager.SetAuthToken(token); err != nil {
		h.logger.Error("Failed to set auth token", "error", err)
		return ctx.String(http.StatusUnauthorized, "Invalid authentication token")
	}

	return ctx.String(http.StatusOK, "")
}
