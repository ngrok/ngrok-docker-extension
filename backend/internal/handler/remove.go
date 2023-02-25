package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/ngrok/ngrok-docker-extension/internal/log"
)

func (h *Handler) RemoveTunnel(ctx echo.Context) error {
	ctr := ctx.Param("container")
	if ctr == "" {
		return ctx.String(http.StatusBadRequest, "container is required")
	}
	log.Infof("container: %s", ctr)

	h.ProgressCache.Lock()
	defer h.ProgressCache.Unlock()

	h.ProgressCache.m[ctr].Tunnel.Session().Close()

	delete(h.ProgressCache.m, ctr)

	return ctx.JSON(http.StatusOK, h.ProgressCache.m)
}
