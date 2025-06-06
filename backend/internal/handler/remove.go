package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func (h *Handler) RemoveTunnel(ctx echo.Context) error {
	ctr := ctx.Param("container")
	if ctr == "" {
		return ctx.String(http.StatusBadRequest, "container is required")
	}
	h.logger.Info("Removing tunnel for container", "container", ctr)

	remainingTunnels := h.sessionManager.RemoveTunnel(ctr)

	return ctx.JSON(http.StatusOK, remainingTunnels)
}
