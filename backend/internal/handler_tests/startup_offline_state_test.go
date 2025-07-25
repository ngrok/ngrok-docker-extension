package handler_tests

import (
	"context"
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestExtensionStartup_OfflineAgentAndEndpoint_StaysOfflineButConfigurable(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Create initial state simulating a previously stopped extension with offline agent and endpoint
	initialState := &store.State{
		AgentConfig: store.AgentConfig{
			AuthToken:     "ngrok_offline_token",
			ExpectedState: "offline",
		},
		EndpointConfigs: map[string]store.EndpointConfig{
			"offline-container:4000": {
				ID:            "offline-container:4000",
				ContainerID:   "offline-container",
				TargetPort:    "4000",
				URL:           "offline-app",
				ExpectedState: "offline",
			},
		},
		Version: 1,
	}

	// Create test environment and set initial state
	env := setupTestEnvironment(t, ctrl)
	err := env.Store.Save(initialState)
	assert.NoError(t, err, "Setting initial state should succeed")

	// We don't expect any ngrok SDK calls since everything should stay offline

	// Simulate extension startup by running convergence
	err = env.Manager.Converge(context.Background())
	assert.NoError(t, err, "Convergence should succeed during startup even with offline state")

	// Verify agent stays offline via API
	agentResponse := env.getAgent()
	assert.Equal(t, "offline", agentResponse.ExpectedState, "Agent expectedState should remain offline after startup")
	assert.Equal(t, manager.AgentStateOffline, agentResponse.Status.State, "Agent should remain offline after startup")

	// Verify endpoint configuration is queryable but stays offline via API
	endpointsResponse := env.getEndpoints()
	assert.Len(t, endpointsResponse.Endpoints, 1, "Should have one endpoint")

	endpoint := endpointsResponse.Endpoints[0]
	assert.Equal(t, "offline-container:4000", endpoint.ID, "Endpoint ID should match")
	assert.Equal(t, "offline", endpoint.ExpectedState, "Endpoint expectedState should remain offline")
	assert.Equal(t, manager.EndpointStateOffline, endpoint.Status.State, "Endpoint should remain offline after startup")
	assert.Empty(t, endpoint.Status.URL, "Endpoint should not have ngrok URL when offline")

	// Verify we can still query individual endpoint by ID
	endpointResponse := env.getEndpointByID("offline-container:4000")
	assert.Equal(t, "offline-container:4000", endpointResponse.ID, "Individual endpoint query should work")
	assert.Equal(t, "offline", endpointResponse.ExpectedState, "Individual endpoint should show offline state")
}
