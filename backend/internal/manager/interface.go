//go:generate mockgen -destination=mocks/mock_ngrok_agent.go -package=mocks golang.ngrok.com/ngrok/v2 Agent
//go:generate mockgen -destination=mocks/mock_endpoint_forwarder.go -package=mocks golang.ngrok.com/ngrok/v2 EndpointForwarder
//go:generate mockgen -destination=mocks/mock_store.go -package=mocks github.com/ngrok/ngrok-docker-extension/internal/store Store

package manager

import (
	"context"
	"time"
)

// Manager handles convergence between desired and actual state
type Manager interface {
	Converge(ctx context.Context) error
	AgentStatus() AgentStatus
	EndpointStatus() map[string]EndpointStatus
	Shutdown(ctx context.Context) error
}

// AgentStatus represents runtime state of the agent
type AgentStatus struct {
	State       string        `json:"state"` // "online" | "offline" | "reconnecting"
	ConnectedAt time.Time     `json:"connectedAt"`
	LastError   string        `json:"lastError,omitempty"`
	Latency     time.Duration `json:"latency,omitempty"` // connection latency from heartbeat
}

// EndpointState constants represent the possible states an endpoint can be in
const (
	EndpointStateOnline   = "online"
	EndpointStateOffline  = "offline"
	EndpointStateStarting = "starting"
	EndpointStateFailed   = "failed"
)

const (
	AgentStateOnline     = "online"
	AgentStateOffline    = "offline"
	AgentStateConnecting = "connecting"
)

// EndpointStatus represents runtime state of an endpoint
type EndpointStatus struct {
	URL       string `json:"url,omitempty"` // ngrok public URL
	State     string `json:"state"`               // "online" | "offline" | "starting"
	LastError string `json:"lastError,omitempty"` // last error from convergence
}
