package handler_tests

import (
	"testing"

	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestDeleteEndpoint_CallsForwarderClose(t *testing.T) {
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

	// Delete the endpoint - this should trigger Forwarder.Close()
	env.deleteEndpoint("test-container:8080")
}
