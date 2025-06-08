package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func (h *Handler) RemoveEndpoint(ctx echo.Context) error {
	var req RemoveRequest
	if err := ctx.Bind(&req); err != nil {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid request format"})
	}
	
	if req.ContainerID == "" {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "containerId is required"})
	}
	h.logger.Info("Removing endpoint for container", "containerID", req.ContainerID)

	remainingEndpointsMap := h.sessionManager.RemoveEndpoint(req.ContainerID)
	remainingEndpoints := convertEndpointsToSlice(remainingEndpointsMap)
	return ctx.JSON(http.StatusOK, RemoveResponse{RemainingEndpoints: remainingEndpoints})
}
