package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// ActionsInProgress handles the /progress endpoint
func (h *Handler) ActionsInProgress(ctx echo.Context) error {
	tunnels := h.sessionManager.GetTunnels()
	return ctx.JSON(http.StatusOK, tunnels)
}
