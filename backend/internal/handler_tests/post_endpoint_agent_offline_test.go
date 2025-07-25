package handler_tests

import (
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPostEndpoint_AgentOffline_BringsBothOnline(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	env := setupTestEnvironment(t, ctrl)
	env.setupStandardMockExpectations()

	// Mock Docker to return container as available
	env.expectDockerContainer("test-container", true)

	// Create an agent with expectedState=offline (agent is offline initially)
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "offline",
	})

	// Verify agent is offline initially
	agentResponse := env.getAgent()
	assert.Equal(t, "offline", agentResponse.ExpectedState, "Agent expectedState should be offline initially")
	assert.Equal(t, manager.AgentStateOffline, agentResponse.Status.State, "Agent should be offline initially")

	// Create a mock forwarder for when the endpoint comes online
	mockForwarder := env.createMockForwarder(ctrl, "https://test.ngrok.io", "endpoint-id")
	env.expectAgentForward().Return(mockForwarder, nil).Times(1)

	// POST an endpoint - this should set agent expectedState to online and bring both online
	createRequest := handler.EndpointRequest{
		ContainerID:   "test-container",
		TargetPort:    "8080",
		ExpectedState: "online",
	}
	endpointResponse := env.postEndpoint(createRequest)

	// Verify the endpoint was created with expectedState=online and is online
	assert.Equal(t, "online", endpointResponse.ExpectedState, "Endpoint expectedState should be online")
	assert.Equal(t, manager.EndpointStateOnline, endpointResponse.Status.State, "Endpoint should be online")
	assert.Equal(t, "https://test.ngrok.io", endpointResponse.Status.URL, "Endpoint should have the ngrok URL")

	// Verify agent is now online as well
	agentResponse = env.getAgent()
	assert.Equal(t, "online", agentResponse.ExpectedState, "Agent expectedState should be online after endpoint creation")
	assert.Equal(t, manager.AgentStateOnline, agentResponse.Status.State, "Agent should be online after endpoint creation")
}
