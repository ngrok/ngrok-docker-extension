package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func (h *Handler) StartEndpoint(ctx echo.Context) error {
	var req StartRequest
	if err := ctx.Bind(&req); err != nil {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid request format"})
	}
	
	if req.ContainerID == "" {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "containerId is required"})
	}
	if req.Port == "" {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "port is required"})
	}
	
	h.logger.Info("Starting endpoint for container", "containerID", req.ContainerID)
	h.logger.Info("Using port", "port", req.Port)

	tun, err := h.sessionManager.StartEndpoint(ctx.Request().Context(), req.Port)

	if err != nil {
		h.logger.Error("Failed to start endpoint", "error", err)
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	endpointURL := tun.URL().String()
	endpointID := tun.ID()
	h.logger.Info("Endpoint created", "endpointID", endpointID, "url", endpointURL)

	h.sessionManager.AddEndpoint(req.ContainerID, endpointID, endpointURL, tun)

	endpoint := Endpoint{
		ID:  endpointID,
		URL: endpointURL,
	}

	return ctx.JSON(http.StatusCreated, StartResponse{Endpoint: endpoint})
}
