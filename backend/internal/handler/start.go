package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/labstack/echo/v4"

	"github.com/felipecruz91/ngrok-go/internal"
	"github.com/felipecruz91/ngrok-go/internal/log"
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

	cli, err := h.DockerClient()
	if err != nil {
		return err
	}

	volumeName := "my-ngrok-volume" //TODO: create it if not exists with the right data

	resp, err := cli.ContainerCreate(ctxReq, &container.Config{
		Image:        internal.NgrokImage,
		Tty:          false, // -d
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"http", port, "--log=stdout", "--log-format=json"},
		User:         "root",
		Labels: map[string]string{
			"com.docker.desktop.extension":      "true",
			"com.docker.desktop.extension.name": "Ngrok Docker Extension",
			"app.container":                     ctr,
			"com.docker.compose.project":        "felipecruz_ngrok-docker-extension-desktop-extension",
		},
		Env: []string{fmt.Sprintf("NGROK_AUTHTOKEN=%s", h.NgrokAuthToken)},
	}, &container.HostConfig{
		AutoRemove:  false,
		NetworkMode: "host",
		Binds: []string{
			//volumeName + ":" + "/root/.config/ngrok/",
			volumeName + ":" + "/var/lib/ngrok",
		},
	}, nil, nil, "")
	if err != nil {
		return err
	}

	if err := cli.ContainerStart(ctxReq, resp.ID, types.ContainerStartOptions{}); err != nil {
		return err
	}

	time.Sleep(3 * time.Second) //TODO: improve it

	out, err := cli.ContainerLogs(ctxReq, resp.ID, types.ContainerLogsOptions{ShowStdout: true, ShowStderr: true})
	if err != nil {
		return err
	}

	var buf bytes.Buffer
	_, err = stdcopy.StdCopy(&buf, os.Stderr, out)
	if err != nil {
		return err
	}

	var st StartTunnelLine
	for _, line := range strings.Split(buf.String(), "\n") {
		log.Infof(line)

		if strings.Contains(line, "Your account is limited to 1 simultaneous ngrok agent session") {

			if err := json.Unmarshal([]byte(line), &st); err != nil {
				return err
			}

			_ = cli.ContainerRemove(ctxReq, resp.ID, types.ContainerRemoveOptions{Force: true})

			return ctx.String(http.StatusInternalServerError, st.Err)
		}

		if strings.Contains(line, "started tunnel") {
			if err := json.Unmarshal([]byte(line), &st); err != nil {
				return err
			}
			break
		}
	}

	h.ProgressCache.Lock()
	h.ProgressCache.m[ctr] = Tunnel{ContainerID: resp.ID, URL: st.URL}
	h.ProgressCache.Unlock()

	return ctx.String(http.StatusCreated, st.URL)
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
