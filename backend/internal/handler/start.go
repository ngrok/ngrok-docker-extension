package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func (h *Handler) StartEndpoint(ctx echo.Context) error {
	ctr := ctx.Param("container")
	if ctr == "" {
		return ctx.String(http.StatusBadRequest, "container is required")
	}
	h.logger.Info("Starting endpoint for container", "container", ctr)

	port := ctx.QueryParam("port")
	if port == "" {
		return ctx.String(http.StatusBadRequest, "port is required")
	}
	h.logger.Info("Using port", "port", port)

	tun, err := h.sessionManager.StartEndpoint(ctx.Request().Context(), port)

	if err != nil {
		h.logger.Error("Failed to start endpoint", "error", err)
		return err
	}

	endpointURL := tun.URL().String()
	endpointID := tun.ID()
	h.logger.Info("Endpoint created", "endpointID", endpointID, "url", endpointURL)

	h.sessionManager.AddEndpoint(ctr, endpointID, endpointURL, tun)

	return ctx.JSON(http.StatusCreated, map[string]interface{}{"EndpointID": endpointID, "URL": endpointURL})
}
