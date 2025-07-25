package handler_tests

import (
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPutEndpointByID_UpdateOfflineToOnlineCallsForward(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)

	// Setup agent expectations - agent should be created and connected
	env.expectNewAgent().Times(1)
	env.expectAgentConnect().Times(1)

	// Create a mock EndpointForwarder for the Forward() call
	mockForwarder := env.createMockForwarder(ctrl, "https://myapp.ngrok.io", "endpoint-id-123")

	// standard protocol detection
	env.expectHTTPProtocolDetection()

	// Expect Agent.Forward() to be called when endpoint goes online
	env.expectAgentForward().
		Return(mockForwarder, nil).
		Times(1)

	// Create initial state with offline agent and offline endpoint
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
				URL:           "myapp",
				Description:   "My app",
				ExpectedState: "offline",
			},
		},
		Version: 1,
	}
	env.Store.Save(initialState)

	// Mock Docker container as available
	env.expectDockerContainer("test-container", true)

	// Update the endpoint to go online
	updateRequest := handler.EndpointRequest{
		ContainerID:   "test-container",
		TargetPort:    "8080",
		URL:           "myapp",
		Description:   "My app",
		ExpectedState: "online", // Change from offline to online
	}

	// Execute PUT request
	response := env.putEndpoint("test-container:8080", updateRequest)

	// Verify response shows endpoint is now online
	assert.Equal(t, "test-container:8080", response.ID)
	assert.Equal(t, "test-container", response.ContainerID)
	assert.Equal(t, "8080", response.TargetPort)
	assert.Equal(t, "myapp", response.URL)
	assert.Equal(t, "My app", response.Description)
	assert.Equal(t, "online", response.ExpectedState)
	assert.Equal(t, manager.EndpointStateOnline, response.Status.State)
	assert.Equal(t, "https://myapp.ngrok.io", response.Status.URL)
	assert.Empty(t, response.Status.LastError)

	// Verify persistent state was updated
	state, err := env.Store.Load()
	if assert.NoError(t, err) {
		endpointConfig, exists := state.EndpointConfigs["test-container:8080"]
		if assert.True(t, exists) {
			assert.Equal(t, "online", endpointConfig.ExpectedState)
		}

		// Agent should now be online since endpoint is online
		assert.Equal(t, "online", state.AgentConfig.ExpectedState)
	}
}
