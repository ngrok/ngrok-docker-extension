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

func TestPutEndpoint_ForwardError_EndpointExpectedOnlineStatusOfflineWithError(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	env := setupTestEnvironment(t, ctrl)
	env.setupStandardMockExpectations()

	// Mock Docker to return container as available
	env.expectDockerContainer("test-container", true)

	// Create an agent first
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	})

	// Expect Agent.Forward() to return an error
	forwardError := errors.New("ngrok forward failed: tunnel session failed")
	env.expectAgentForward().Return(nil, forwardError).Times(1)

	// PUT an endpoint which should fail to forward
	updateRequest := handler.EndpointRequest{
		ContainerID:   "test-container",
		TargetPort:    "8080",
		ExpectedState: "online",
	}
	response := env.putEndpoint("test-container:8080", updateRequest)

	// Verify the endpoint configuration was saved with expectedState=online
	assert.Equal(t, "online", response.ExpectedState, "Endpoint expectedState should be online even when forward fails")

	// Verify the endpoint runtime status shows failed with error
	assert.Equal(t, manager.EndpointStateFailed, response.Status.State, "Endpoint status should be failed when forward fails")
	assert.Contains(t, response.Status.LastError, "failed to create endpoint", "Endpoint status should contain the forward error")
	assert.Contains(t, response.Status.LastError, "tunnel session failed", "Endpoint status should contain the actual ngrok error")
}
