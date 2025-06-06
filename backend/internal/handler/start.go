package handler

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/ngrok/ngrok-docker-extension/internal/log"
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
	log.Infof("container: %s", ctr)

	port := ctx.QueryParam("port")
	if port == "" {
		return ctx.String(http.StatusBadRequest, "port is required")
	}
	log.Infof("port: %s", port)

	tun, err := session.StartTunnel(ctxReq, port)

	if err != nil {
		log.Error("Failed to start tunnel:", err)
		return err
	}

	// No need to call forwardTraffic - EndpointForwarder handles this automatically
	
	tunnelURL := tun.URL().String()
	tunnelID := tun.ID()
	log.Infof("Tunnel created - ID: %s, URL: %s", tunnelID, tunnelURL)

	session.Cache.Lock()
	session.Cache.Tunnels[ctr] = session.Tunnel{Endpoint: tun, TunnelID: tunnelID, URL: tunnelURL}
	session.Cache.Unlock()

	return ctx.JSON(http.StatusCreated, map[string]interface{}{"TunnelID": tunnelID, "URL": tunnelURL})
}



type StartTunnelLine struct {
	Err  string    `json:"err"`
	Addr string    `json:"addr"`
	Lvl  string    `json:"lvl"`
	Msg  string    `json:"msg"`
	Name string    `json:"name"`
	Obj  string    `json:"obj"`
	T    time.Time `json:"t"`
	URL  string    `json:"url"`
}
