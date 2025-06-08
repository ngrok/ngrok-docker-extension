package handler

import (
	"log/slog"
	"slices"

	"github.com/docker/docker/client"

	"github.com/ngrok/ngrok-docker-extension/internal/session"
)

type Handler struct {
	DockerClient   func() (*client.Client, error)
	logger         *slog.Logger
	sessionManager *session.Manager
}

func New(cliFactory func() (*client.Client, error), logger *slog.Logger, sessionManager *session.Manager) *Handler {
	return &Handler{
		DockerClient:   cliFactory,
		logger:         logger,
		sessionManager: sessionManager,
	}
}

// Helper function to convert session manager endpoints to our response format
func convertEndpointsToSlice(endpointsMap map[string]session.Endpoint) []Endpoint {
	return slices.Collect(func(yield func(Endpoint) bool) {
		for _, sessionEndpoint := range endpointsMap {
			if !yield(Endpoint{
				ID:  sessionEndpoint.EndpointID,
				URL: sessionEndpoint.URL,
			}) {
				return
			}
		}
	})
}
