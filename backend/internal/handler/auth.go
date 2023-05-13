package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/ngrok/ngrok-docker-extension/internal/log"
	"github.com/ngrok/ngrok-docker-extension/internal/session"
)

func (h *Handler) SetupAuth(ctx echo.Context) error {
	log.Info("Setting up ngrok authtoken")
	token := ctx.QueryParam("token")
	if token == "" {
		return ctx.String(http.StatusBadRequest, "token is required")
	}

	session.SetAuthToken(token)

	return ctx.String(http.StatusOK, "")
}
