package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func (h *Handler) RemoveEndpoint(ctx echo.Context) error {
	ctr := ctx.Param("container")
	if ctr == "" {
		return ctx.String(http.StatusBadRequest, "container is required")
	}
	h.logger.Info("Removing endpoint for container", "container", ctr)

	remainingEndpoints := h.sessionManager.RemoveEndpoint(ctr)

	return ctx.JSON(http.StatusOK, remainingEndpoints)
}
