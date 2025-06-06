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

	h.sessionManager.SetAuthToken(token)

	return ctx.String(http.StatusOK, "")
}
