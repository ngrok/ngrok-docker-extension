package handler_tests

import (
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPutEndpointByID_UpdateOfflineEndpointConfiguration(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)

	// Create initial state with an offline endpoint
	initialState := &store.State{
		AgentConfig: store.AgentConfig{
			AuthToken:     "ngrok_test_token",
			ExpectedState: "offline",
		},
		EndpointConfigs: map[string]store.EndpointConfig{
			"test-container:8080": {
				ID:            "test-container:8080",
				ContainerID:   "test-container",
				TargetPort:    "8080",
				URL:           "oldapp",
				Description:   "Old description",
				ExpectedState: "offline",
			},
		},
		Version: 1,
	}
	env.Store.Save(initialState)

	// Update the endpoint configuration while keeping it offline
	updateRequest := handler.EndpointRequest{
		ContainerID:   "test-container",
		TargetPort:    "8080",
		URL:           "newapp",
		Description:   "New description",
		Metadata:      "updated=true",
		ExpectedState: "offline", // Keep it offline
	}

	// Execute PUT request
	response := env.putEndpoint("test-container:8080", updateRequest)

	// Verify response shows updated configuration but endpoint remains offline
	assert.Equal(t, "test-container:8080", response.ID)
	assert.Equal(t, "test-container", response.ContainerID)
	assert.Equal(t, "8080", response.TargetPort)
	assert.Equal(t, "newapp", response.URL)
	assert.Equal(t, "New description", response.Description)
	assert.Equal(t, "updated=true", response.Metadata)
	assert.Equal(t, "offline", response.ExpectedState)
	assert.Equal(t, manager.EndpointStateOffline, response.Status.State)
	assert.Empty(t, response.Status.URL)

	// Verify persistent state was updated correctly
	state, err := env.Store.Load()
	if assert.NoError(t, err) {
		endpointConfig, exists := state.EndpointConfigs["test-container:8080"]
		if assert.True(t, exists) {
			assert.Equal(t, "newapp", endpointConfig.URL)
			assert.Equal(t, "New description", endpointConfig.Description)
			assert.Equal(t, "updated=true", endpointConfig.Metadata)
			assert.Equal(t, "offline", endpointConfig.ExpectedState)
		}

		// Agent should remain offline since endpoint is offline
		assert.Equal(t, "offline", state.AgentConfig.ExpectedState)
	}
}
