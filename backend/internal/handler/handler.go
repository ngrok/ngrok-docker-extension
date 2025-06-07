package handler

import (
	"log/slog"

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


