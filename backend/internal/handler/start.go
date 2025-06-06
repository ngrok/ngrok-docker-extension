package handler

import (
	"context"
	"net/http"

	"github.com/labstack/echo/v4"
)

func (h *Handler) StartTunnel(ctx echo.Context) error {
	ctxReq := context.Background()

	ctr := ctx.Param("container")
	if ctr == "" {
		return ctx.String(http.StatusBadRequest, "container is required")
	}
	h.logger.Info("Starting tunnel for container", "container", ctr)

	port := ctx.QueryParam("port")
	if port == "" {
		return ctx.String(http.StatusBadRequest, "port is required")
	}
	h.logger.Info("Using port", "port", port)

	tun, err := h.sessionManager.StartTunnel(ctxReq, port)

	if err != nil {
		h.logger.Error("Failed to start tunnel", "error", err)
		return err
	}

	tunnelURL := tun.URL().String()
	tunnelID := tun.ID()
	h.logger.Info("Tunnel created", "tunnelID", tunnelID, "url", tunnelURL)

	h.sessionManager.AddTunnel(ctr, tunnelID, tunnelURL, tun)

	return ctx.JSON(http.StatusCreated, map[string]interface{}{"TunnelID": tunnelID, "URL": tunnelURL})
}
