package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/felipecruz91/ngrok-go/internal/log"
)

func (h *Handler) SetupAuth(ctx echo.Context) error {
	token := ctx.QueryParam("token")
	if token == "" {
		return ctx.String(http.StatusBadRequest, "token is required")
	}
	log.Infof("token: %s", token)

	h.NgrokAuthToken = token

	return ctx.String(http.StatusOK, "")
}
