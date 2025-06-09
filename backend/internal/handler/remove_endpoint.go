package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func (h *Handler) RemoveEndpoint(ctx echo.Context) error {
	var req RemoveEndpointRequest
	if err := ctx.Bind(&req); err != nil {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid request format"})
	}
	
	if req.ContainerID == "" {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "containerId is required"})
	}
	h.logger.Info("Removing endpoint for container", "containerID", req.ContainerID)

	if err := h.endpointManager.RemoveEndpoint(ctx.Request().Context(), req.ContainerID); err != nil {
		h.logger.Error("Failed to remove endpoint", "error", err)
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	remainingEndpointsMap := h.endpointManager.ListEndpoints()
	remainingEndpoints := convertEndpointsToSlice(remainingEndpointsMap)
	return ctx.JSON(http.StatusOK, RemoveEndpointResponse{RemainingEndpoints: remainingEndpoints})
}
