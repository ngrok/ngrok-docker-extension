package handler

import (
	"log/slog"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

type Handler struct {
	logger  *slog.Logger
	Manager manager.Manager
	Store   store.Store
}

func New(e *echo.Echo, mgr manager.Manager, store store.Store, logger *slog.Logger) *Handler {
	h := &Handler{
		logger:  logger,
		Manager: mgr,
		Store:   store,
	}

	// State management routes
	e.PUT("/agent", h.PutAgent)
	e.GET("/agent", h.GetAgent)
	e.POST("/endpoints", h.PostEndpoints)
	e.GET("/endpoints", h.GetEndpoints)
	e.GET("/endpoints/:id", h.GetEndpointByID)
	e.PUT("/endpoints/:id", h.PutEndpointByID)
	e.DELETE("/endpoints/:id", h.DeleteEndpointByID)

	// Utility routes
	e.POST("/detect_protocol", h.DetectProtocol)

	return h
}

// ErrorResponse (for HTTP error cases)
type ErrorResponse struct {
	Error string `json:"error"`
}

// internalServerError returns a 500 internal server error response
func (h *Handler) internalServerError(c echo.Context, message string) error {
	return c.JSON(http.StatusInternalServerError, map[string]string{"error": message})
}
