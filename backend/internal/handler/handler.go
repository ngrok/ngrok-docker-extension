package handler

import (
	"log/slog"
	"slices"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/ngrok/ngrok-docker-extension/internal/endpoint"
)

type Handler struct {
	logger          *slog.Logger
	endpointManager endpoint.Manager
}

func New(logger *slog.Logger, endpointManager endpoint.Manager, router *echo.Echo) *Handler {
	h := &Handler{
		logger:          logger,
		endpointManager: endpointManager,
	}
	
	// Setup routes
	router.POST("/configure_agent", h.ConfigureAgent)
	router.GET("/list_endpoints", h.ListEndpoints)
	router.POST("/create_endpoint", h.CreateEndpoint)
	router.POST("/remove_endpoint", h.RemoveEndpoint)
	router.GET("/agent_status", h.GetAgentStatus)
	router.POST("/detect_protocol", h.DetectProtocol)
	
	return h
}

// Helper function to convert endpoint manager endpoints to our response format
func convertEndpointsToSlice(endpointsMap map[string]*endpoint.Endpoint) []Endpoint {
	return slices.Collect(func(yield func(Endpoint) bool) {
		for _, ep := range endpointsMap {
			if !yield(Endpoint{
				ID:          ep.Forwarder.ID(),
				URL:         ep.Forwarder.URL().String(),
				ContainerID: ep.ContainerID,
				TargetPort:  ep.TargetPort,
				LastStarted: ep.StartedAt.Format(time.RFC3339),
			}) {
				return
			}
		}
	})
}
