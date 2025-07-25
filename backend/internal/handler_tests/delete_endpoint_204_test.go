package handler_tests

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestDeleteEndpoint_Success(t *testing.T) {
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

	// Create a mock forwarder for the endpoint
	mockForwarder := env.createMockForwarder(ctrl, "https://test.ngrok.io", "endpoint-id")
	env.expectAgentForward().Return(mockForwarder, nil).Times(1)

	// Expect the forwarder to be closed when endpoint is deleted
	mockForwarder.EXPECT().Close().Return(nil).Times(1)

	// Create an endpoint first
	createRequest := handler.EndpointRequest{
		ContainerID:   "test-container",
		TargetPort:    "8080",
		ExpectedState: "online",
	}
	env.postEndpoint(createRequest)

	// Verify endpoint exists in store before deletion
	state, err := env.Store.Load()
	assert.NoError(t, err)
	_, exists := state.EndpointConfigs["test-container:8080"]
	assert.True(t, exists, "Endpoint should exist before deletion")

	// Delete the endpoint
	env.deleteEndpoint("test-container:8080")

	// Verify endpoint no longer exists in store
	state, err = env.Store.Load()
	assert.NoError(t, err)
	_, exists = state.EndpointConfigs["test-container:8080"]
	assert.False(t, exists, "Endpoint should be removed from store")

	// Verify endpoint cannot be queried via GET /endpoints/:id (should return 404)
	errorResponse := env.getEndpointByIDExpectingError("test-container:8080", http.StatusNotFound)
	assert.Equal(t, "Endpoint not found", errorResponse["error"])
}
