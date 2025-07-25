package main

import (
	"context"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"golang.ngrok.com/ngrok/v2"
)

// ngrokWrapper provides a concrete implementation of the NgrokSDK interface
type ngrokWrapper struct{}

func (w *ngrokWrapper) NewAgent(agentOpts ...ngrok.AgentOption) (ngrok.Agent, error) {
	return ngrok.NewAgent(agentOpts...)
}

// dockerWrapper adapts the Docker client to our interface
type dockerWrapper struct {
	client *client.Client
}

func (w *dockerWrapper) ContainerInspect(ctx context.Context, containerID string) (types.ContainerJSON, error) {
	return w.client.ContainerInspect(ctx, containerID)
}
