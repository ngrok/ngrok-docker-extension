package handler_tests

import (
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"github.com/ngrok/ngrok-docker-extension/internal/manager/mocks"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPostEndpoints_AgentForwardSuccess(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment with shared helpers
	env := setupTestEnvironment(t, ctrl)

	// Create a mock EndpointForwarder
	mockForwarder := mocks.NewMockEndpointForwarder(ctrl)
	expectedURL, _ := url.Parse("https://test-123-8080.ngrok.io")

	// Setup forwarder expectations
	mockForwarder.EXPECT().URL().Return(expectedURL).AnyTimes()
	mockForwarder.EXPECT().ID().Return("endpoint-id-123").AnyTimes()

	// Setup agent expectations - agent should be created and connected
	env.expectNewAgent().Times(1)
	env.expectAgentConnect().Times(1)

	// Expect Agent.Forward() to be called and return our mock forwarder
	env.expectAgentForward().
		Return(mockForwarder, nil).
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

	// Verify response contains the URL from the mock forwarder
	assert.Equal(t, "test-container-123:8080", actualResponse.ID)
	assert.Equal(t, "test-container-123", actualResponse.ContainerID)
	assert.Equal(t, "8080", actualResponse.TargetPort)
	assert.Equal(t, "online", actualResponse.ExpectedState)
	assert.Equal(t, manager.EndpointStateOnline, actualResponse.Status.State)
	assert.Equal(t, "https://test-123-8080.ngrok.io", actualResponse.Status.URL)
	assert.Empty(t, actualResponse.Status.LastError)
}
