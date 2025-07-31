//go:generate mockgen -source=dependency_interfaces.go -destination=mocks/dependency_mocks.go -package=mocks

package manager

import (
	"context"

	"github.com/docker/docker/api/types"
	"github.com/ngrok/ngrok-docker-extension/internal/detectproto"
	"golang.ngrok.com/ngrok/v2"
)

// NgrokSDK wraps ngrok SDK functionality
type NgrokSDK interface {
	NewAgent(agentOpts ...ngrok.AgentOption) (ngrok.Agent, error)
}

// DockerClient wraps Docker client functionality
type DockerClient interface {
	ContainerInspect(ctx context.Context, containerID string) (types.ContainerJSON, error)
}

// ProtocolDetector wraps protocol detection functionality
type ProtocolDetector interface {
	Detect(ctx context.Context, host, port string) (*detectproto.Result, error)
}
