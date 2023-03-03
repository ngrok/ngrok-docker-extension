package handler

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"golang.ngrok.com/ngrok"
	"golang.ngrok.com/ngrok/config"

	"github.com/ngrok/ngrok-docker-extension/internal/log"
)

func (h *Handler) StartTunnel(ctx echo.Context) error {
	if h.ngrokSession == nil {
		ngrokSession, err := ngrok.Connect(ctx.Request().Context(), ngrok.WithAuthtoken(h.ngrokAuthToken))
		if err != nil {
			fmt.Println(err)
			return err
		}

		h.ngrokSession = ngrokSession
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

	oauth := ctx.QueryParam("oauth")
	protocol := ctx.QueryParam("protocol")

	var tunConfig config.Tunnel

	if protocol == "tcp" {
		tunConfig = config.TCPEndpoint()
	} else {
		var options = []config.HTTPEndpointOption{}

		if len(oauth) > 0 {
			options = append(options, config.WithOAuth(oauth))
		}
		// } else {
		// 	options = append(options, config.WithBasicAuth("admin", "admin"))
		// }

		// if true {
		// 	options = append(options, config.WithDomain("my-ngrok-docker-extension"))
		// }

		// if true {
		// 	options = append(options, config.WithDomain("my-ngrok-docker-extension.ngrok.io"))
		// }

		// if true {
		// 	options = append(options, config.WithRequestHeader("email", "${.oauth.user.email}"))
		// }

		tunConfig = config.HTTPEndpoint(options...)
	}

	tun, err := h.ngrokSession.Listen(ctxReq, tunConfig)

	if err != nil {
		fmt.Println(err)
		return err
	}

	go forwardTraffic(tun, port)

	h.ProgressCache.Lock()
	h.ProgressCache.m[ctr] = Tunnel{Tunnel: tun, TunnelID: tun.ID(), URL: tun.URL()}
	h.ProgressCache.Unlock()

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
