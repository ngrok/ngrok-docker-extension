package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// ActionsInProgress handles the /progress endpoint
func (h *Handler) ActionsInProgress(ctx echo.Context) error {
	endpointsMap := h.sessionManager.GetEndpoints()
	endpoints := convertEndpointsToSlice(endpointsMap)
	return ctx.JSON(http.StatusOK, ProgressResponse{Endpoints: endpoints})
}
