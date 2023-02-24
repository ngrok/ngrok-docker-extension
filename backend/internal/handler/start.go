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

	/*
		cli, err := h.DockerClient()
		if err != nil {
			return err
		}

		volumeName := "my-ngrok-volume"

		// we pull the image before creating the container just in case it was removed by the user manually
		_, _, err = cli.ImageInspectWithRaw(ctxReq, internal.NgrokImage)
		if err != nil {
			reader, err := cli.ImagePull(ctxReq, internal.NgrokImage, types.ImagePullOptions{
				Platform: "linux/" + runtime.GOARCH,
			})
			if err != nil {
				return err
			}
			_, err = io.Copy(io.Discard, reader)
		}
	*/

	// var cmd []string

	// if protocol == "http" {
	// 	if len(oauth) > 0 {
	// 		cmd = []string{"http", port, "--log=stdout", "--log-format=json", fmt.Sprintf("--oauth %s", oauth)}
	// 	} else {
	// 		cmd = []string{"http", port, "--log=stdout", "--log-format=json"}
	// 	}
	// } else {
	// 	cmd = []string{"tcp", port, "--log=stdout", "--log-format=json"}
	// }

	// log.Infof("cmd: %s", cmd)
	// var tun ngrok.Tunnel

	var localConfig config.Tunnel

	if protocol == "tcp" {
		localConfig = config.TCPEndpoint()
	} else {
		var options = []config.HTTPEndpointOption{}

		if len(oauth) > 0 {
			options = append(options, config.WithOAuth(oauth))
		} else {
			options = append(options, config.WithBasicAuth("admin", "admin"))
		}

		if true {
			options = append(options, config.WithDomain("my-ngrok-docker-extension.ngrok.io"))
		}

		if true {
			options = append(options, config.WithRequestHeader("email", "${.oauth.user.email}"))
		}

		localConfig = config.HTTPEndpoint(options...)
	}

	tun, err := ngrok.Listen(ctxReq, localConfig, ngrok.WithAuthtoken(h.ngrokAuthToken))

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
