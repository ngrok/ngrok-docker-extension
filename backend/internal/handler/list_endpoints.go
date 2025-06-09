package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// ListEndpoints handles the /list_endpoints endpoint
func (h *Handler) ListEndpoints(ctx echo.Context) error {
	endpointsMap := h.endpointManager.ListEndpoints()
	endpoints := convertEndpointsToSlice(endpointsMap)
	return ctx.JSON(http.StatusOK, ListEndpointsResponse{Endpoints: endpoints})
}
