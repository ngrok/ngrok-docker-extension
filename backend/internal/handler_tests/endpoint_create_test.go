package handler_tests

import (
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPostEndpoints_CreateNewEndpoint(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment with shared helpers
	env := setupTestEnvironment(t, ctrl)
	env.setupStandardMockExpectations()

	// Create a mock EndpointForwarder for the Forward() call
	mockForwarder := env.createMockForwarder(ctrl, "https://my-app.ngrok.dev", "endpoint-id-123")

	// Expect Agent.Forward() to be called and return our mock forwarder
	env.expectAgentForward().
		Return(mockForwarder, nil).
		Times(1)

	// Pre-create agent configuration using shared helper
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token_preset",
		ExpectedState: "online",
	})

	// Mock Docker to return container as available
	env.expectDockerContainer("test-container-123", true)

	// STEP 2: Create endpoint
	endpointRequest := handler.EndpointRequest{
		ContainerID:   "test-container-123",
		TargetPort:    "8080",
		URL:           "https://my-app.ngrok.dev",
		Description:   "Test application endpoint",
		ExpectedState: "online",
	}

	// Execute request using helper
	actualResponse := env.postEndpoint(endpointRequest)

	// Verify response fields directly
	assert.Equal(t, "test-container-123:8080", actualResponse.ID)
	assert.Equal(t, "https://my-app.ngrok.dev", actualResponse.URL)
	assert.Equal(t, "test-container-123", actualResponse.ContainerID)
	assert.Equal(t, "8080", actualResponse.TargetPort)
	assert.Equal(t, "online", actualResponse.ExpectedState)
	assert.Equal(t, manager.EndpointStateOnline, actualResponse.Status.State)
	assert.Equal(t, "https://my-app.ngrok.dev", actualResponse.Status.URL)
	assert.NotEmpty(t, actualResponse.LastStarted)

	// Verify state was persisted and agent.expectedState updated to "online"
	state, err := env.Store.Load()
	if assert.NoError(t, err, "Store.Load should work when implemented") {
		assert.Equal(t, "online", state.AgentConfig.ExpectedState, "Agent should be set to online when endpoints created")
	}
}
