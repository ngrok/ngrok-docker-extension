package handler_tests

import (
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPutEndpointByID_UpdateOnlineConfigCallsCloseAndForward(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)

	// Setup agent expectations - agent should be created and connected first
	env.expectNewAgent().Times(1)
	env.expectAgentConnect().Times(1)

	// Create mock EndpointForwarders for both the initial and updated endpoints
	mockForwarder1 := env.createMockForwarder(ctrl, "https://oldapp.ngrok.io", "endpoint-id-old")
	// Expect Close() to be called on the old forwarder when config changes
	mockForwarder1.EXPECT().Close().Return(nil).Times(1)

	mockForwarder2 := env.createMockForwarder(ctrl, "https://newapp.ngrok.io", "endpoint-id-new")

	// Expect Agent.Forward() to be called twice:
	// 1. For initial endpoint creation
	// 2. For endpoint recreation with new config
	env.expectAgentForward().
		Return(mockForwarder1, nil).
		Times(1)
	env.expectAgentForward().
		Return(mockForwarder2, nil).
		Times(1)

	// standard protocol detection
	env.expectHTTPProtocolDetection()

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
		URL:           "oldapp",
		Description:   "Old app",
		ExpectedState: "online",
	}
	createResponse := env.postEndpoint(createRequest)

	// Verify the endpoint was created successfully and is online
	assert.Equal(t, "online", createResponse.ExpectedState)
	assert.Equal(t, manager.EndpointStateOnline, createResponse.Status.State)
	assert.Equal(t, "https://oldapp.ngrok.io", createResponse.Status.URL)

	// Now update the endpoint configuration while keeping it online
	updateRequest := handler.EndpointRequest{
		ContainerID:   "test-container",
		TargetPort:    "8080",
		URL:           "newapp",    // Change URL - this should trigger recreation
		Description:   "New app",   // Change description
		Metadata:      "version=2", // Add metadata
		ExpectedState: "online",    // Keep it online
	}

	// Execute PUT request
	response := env.putEndpoint("test-container:8080", updateRequest)

	// Verify response shows endpoint with new configuration and new URL
	assert.Equal(t, "test-container:8080", response.ID)
	assert.Equal(t, "test-container", response.ContainerID)
	assert.Equal(t, "8080", response.TargetPort)
	assert.Equal(t, "newapp", response.URL)
	assert.Equal(t, "New app", response.Description)
	assert.Equal(t, "version=2", response.Metadata)
	assert.Equal(t, "online", response.ExpectedState)
	assert.Equal(t, manager.EndpointStateOnline, response.Status.State)
	assert.Equal(t, "https://newapp.ngrok.io", response.Status.URL) // New URL from new forwarder
	assert.Empty(t, response.Status.LastError)

	// Verify persistent state was updated
	state, err := env.Store.Load()
	if assert.NoError(t, err) {
		endpointConfig, exists := state.EndpointConfigs["test-container:8080"]
		if assert.True(t, exists) {
			assert.Equal(t, "newapp", endpointConfig.URL)
			assert.Equal(t, "New app", endpointConfig.Description)
			assert.Equal(t, "version=2", endpointConfig.Metadata)
			assert.Equal(t, "online", endpointConfig.ExpectedState)
		}
	}
}
