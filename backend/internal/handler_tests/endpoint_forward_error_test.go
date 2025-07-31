package handler_tests

import (
	"errors"
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPostEndpoints_AgentForwardError(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment with shared helpers
	env := setupTestEnvironment(t, ctrl)

	// Setup agent expectations - agent should be created and connected
	env.expectNewAgent().Times(1)
	env.expectAgentConnect().Times(1)

	// Expect Agent.Forward() to be called and return an error
	expectedError := errors.New("failed to create tunnel: insufficient quota")
	env.expectAgentForward().
		Return(nil, expectedError).
		Times(1)

	// standard protocol detection
	env.expectHTTPProtocolDetection()

	// Pre-create agent configuration
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	})

	// Mock Docker to return container as available
	env.expectDockerContainer("test-container-123", true)

	// Create endpoint request
	endpointRequest := handler.EndpointRequest{
		ContainerID:   "test-container-123",
		TargetPort:    "8080",
		ExpectedState: "online",
	}

	// Execute request
	actualResponse := env.postEndpoint(endpointRequest)

	// Verify response shows endpoint with expected state online but status offline with error
	assert.Equal(t, "test-container-123:8080", actualResponse.ID)
	assert.Equal(t, "test-container-123", actualResponse.ContainerID)
	assert.Equal(t, "8080", actualResponse.TargetPort)
	assert.Equal(t, "online", actualResponse.ExpectedState)
	assert.Equal(t, manager.EndpointStateFailed, actualResponse.Status.State)
	assert.Empty(t, actualResponse.Status.URL)
	assert.Contains(t, actualResponse.Status.LastError, "failed to create endpoint")
	assert.Contains(t, actualResponse.Status.LastError, "insufficient quota")
}
