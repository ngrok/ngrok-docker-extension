package handler

import (
	"net/http"
	"sync"

	"github.com/labstack/echo/v4"
)

type ProgressCache struct {
	sync.RWMutex
	m map[string]Tunnel // map of containers and active tunnels
}

type Tunnel struct {
	ContainerID string
	URL         string
}

// ActionsInProgress retrieves the list of active tunnels.
func (h *Handler) ActionsInProgress(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, h.ProgressCache.m)
}

func (h *Handler) Add(key string, containerID, url string) {
	h.ProgressCache.Lock()
	defer h.ProgressCache.Unlock()

	h.ProgressCache.m[key] = Tunnel{
		ContainerID: containerID,
		URL:         url,
	}
}

func (h *Handler) Delete(key string) {
	h.ProgressCache.Lock()
	defer h.ProgressCache.Unlock()

	delete(h.ProgressCache.m, key)
}
