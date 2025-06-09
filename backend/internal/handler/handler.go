package handler

import (
	"log/slog"
	"slices"

	"github.com/docker/docker/client"

	"github.com/ngrok/ngrok-docker-extension/internal/endpoint"
)

type Handler struct {
	DockerClient    func() (*client.Client, error)
	logger          *slog.Logger
	endpointManager endpoint.Manager
}

func New(cliFactory func() (*client.Client, error), logger *slog.Logger, endpointManager endpoint.Manager) *Handler {
	return &Handler{
		DockerClient:    cliFactory,
		logger:          logger,
		endpointManager: endpointManager,
	}
}

// Helper function to convert endpoint manager endpoints to our response format
func convertEndpointsToSlice(endpointsMap map[string]*endpoint.Endpoint) []Endpoint {
	return slices.Collect(func(yield func(Endpoint) bool) {
		for _, ep := range endpointsMap {
			if !yield(Endpoint{
				ID:  ep.Forwarder.ID(),
				URL: ep.Forwarder.URL().String(),
			}) {
				return
			}
		}
	})
}
