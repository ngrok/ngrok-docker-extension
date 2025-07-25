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

func TestPutEndpointByID_UpdateOnlineToOfflineCallsClose(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)

	// Setup protocol detector expectations
	env.expectHTTPProtocolDetection()

	// Setup agent expectations - agent should be created and connected first
	env.expectNewAgent().Times(1)
	env.expectAgentConnect().Times(1)

	// Create a mock EndpointForwarder for the initial Forward() call
	mockForwarder := mocks.NewMockEndpointForwarder(ctrl)
	expectedURL, _ := url.Parse("https://myapp.ngrok.io")
	mockForwarder.EXPECT().URL().Return(expectedURL).AnyTimes()
	mockForwarder.EXPECT().ID().Return("endpoint-id-123").AnyTimes()

	// Expect Close() to be called when endpoint goes offline
	mockForwarder.EXPECT().Close().Return(nil).Times(1)

	// Expect Agent.Forward() to be called initially to create the endpoint
	env.expectAgentForward().
		Return(mockForwarder, nil).
		Times(1)

	// Pre-create agent configuration
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	})

	// Mock Docker container as available
	env.expectDockerContainer("test-container", true)

	// First create an online endpoint using POST
	createRequest := handler.EndpointRequest{
		ContainerID:   "test-container",
		TargetPort:    "8080",
		URL:           "myapp",
		Description:   "My app",
		ExpectedState: "online",
	}
	createResponse := env.postEndpoint(createRequest)

	// Verify the endpoint was created successfully and is online
	assert.Equal(t, "online", createResponse.ExpectedState)
	assert.Equal(t, manager.EndpointStateOnline, createResponse.Status.State)

	// Now update the endpoint to go offline
	updateRequest := handler.EndpointRequest{
		ContainerID:   "test-container",
		TargetPort:    "8080",
		URL:           "myapp",
		Description:   "My app",
		ExpectedState: "offline", // Change from online to offline
	}

	// Execute PUT request
	response := env.putEndpoint("test-container:8080", updateRequest)

	// Verify response shows endpoint is now offline
	assert.Equal(t, "test-container:8080", response.ID)
	assert.Equal(t, "test-container", response.ContainerID)
	assert.Equal(t, "8080", response.TargetPort)
	assert.Equal(t, "myapp", response.URL)
	assert.Equal(t, "My app", response.Description)
	assert.Equal(t, "offline", response.ExpectedState)
	assert.Equal(t, manager.EndpointStateOffline, response.Status.State)
	assert.Empty(t, response.Status.URL)

	// Verify persistent state was updated
	state, err := env.Store.Load()
	if assert.NoError(t, err) {
		endpointConfig, exists := state.EndpointConfigs["test-container:8080"]
		if assert.True(t, exists) {
			assert.Equal(t, "offline", endpointConfig.ExpectedState)
		}
	}
}
