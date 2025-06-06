package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/ngrok/ngrok-docker-extension/internal/session"
)

func (h *Handler) StartTunnel(ctx echo.Context) error {
	if session.NgrokAgent == nil {
		session.StartNgrokSession()
	}

	ctxReq := ctx.Request().Context()

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

	tun, err := session.StartTunnel(ctxReq, port)

	if err != nil {
		h.logger.Error("Failed to start tunnel", "error", err)
		return err
	}

	// No need to call forwardTraffic - EndpointForwarder handles this automatically

	tunnelURL := tun.URL().String()
	tunnelID := tun.ID()
	h.logger.Info("Tunnel created", "tunnelID", tunnelID, "url", tunnelURL)

	session.Cache.Lock()
	session.Cache.Tunnels[ctr] = session.Tunnel{Endpoint: tun, TunnelID: tunnelID, URL: tunnelURL}
	session.Cache.Unlock()

	return ctx.JSON(http.StatusCreated, map[string]interface{}{"TunnelID": tunnelID, "URL": tunnelURL})
}
