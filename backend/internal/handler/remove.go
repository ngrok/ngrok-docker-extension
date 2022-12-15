package handler

import (
	"net/http"

	"github.com/docker/docker/api/types"
	"github.com/labstack/echo/v4"

	"github.com/felipecruz91/ngrok-go/internal/log"
)

func (h *Handler) RemoveTunnel(ctx echo.Context) error {
	ctxReq := ctx.Request().Context()

	ctr := ctx.Param("container")
	if ctr == "" {
		return ctx.String(http.StatusBadRequest, "container is required")
	}
	log.Infof("container: %s", ctr)

	cli, err := h.DockerClient()
	if err != nil {
		return err
	}

	h.ProgressCache.Lock()
	defer h.ProgressCache.Unlock()

	err = cli.ContainerRemove(ctxReq, h.ProgressCache.m[ctr].ContainerID, types.ContainerRemoveOptions{Force: true})
	if err != nil {
		return err
	}

	delete(h.ProgressCache.m, ctr)

	return ctx.String(http.StatusOK, "")
}
