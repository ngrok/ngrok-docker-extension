package handler

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"golang.ngrok.com/ngrok"

	"github.com/ngrok/ngrok-docker-extension/internal/log"
	"github.com/ngrok/ngrok-docker-extension/internal/session"
)

func (h *Handler) StartTunnel(ctx echo.Context) error {
	if session.NgrokRootSession == nil {
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

	tun, err := session.StartTunnel(ctxReq)

	if err != nil {
		fmt.Println(err)
		return err
	}

	go forwardTraffic(tun, port)

	session.Cache.Lock()
	session.Cache.Tunnels[ctr] = session.Tunnel{Tunnel: tun, TunnelID: tun.ID(), URL: tun.URL()}
	session.Cache.Unlock()

	return ctx.JSON(http.StatusCreated, map[string]interface{}{"TunnelID": tun.ID(), "URL": tun.URL()})
}

func forwardTraffic(tun ngrok.Tunnel, port string) {
	for {
		conn, err := tun.Accept()
		if err != nil {
			log.Error(err)
			return
		}
		go handleRequest(conn, port)
	}
}

func handleRequest(conn net.Conn, port string) {
	defer conn.Close()
	remote, err := net.Dial("tcp", "172.17.0.1:"+port)
	if err != nil {
		log.Error(err)
		return
	}
	defer remote.Close()
	go io.Copy(remote, conn)
	io.Copy(conn, remote)
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
