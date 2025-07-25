package handler_tests

import (
	"errors"
	"testing"

	"github.com/ngrok/ngrok-docker-extension/internal/manager"

	"github.com/docker/docker/api/types"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPostEndpoints_OfflineContainer(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)

	// Setup agent expectations (agent should be online for endpoint creation)
	env.expectNewAgent().Times(1)
	env.expectAgentConnect().Times(1)

	// Create a mock EndpointForwarder for the Forward() call
	mockForwarder := env.createMockForwarder(ctrl, "https://offline-container-8080.ngrok.io", "endpoint-id-offline")

	// Expect Agent.Forward() to be called and succeed despite container being offline
	env.expectAgentForward().
		Return(mockForwarder, nil).
		Times(1)

	// setup protocol detection
	env.expectHTTPProtocolDetection()

	// Pre-create agent configuration
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	})

	// Mock Docker to return container as NOT running (offline)
	env.MockDocker.EXPECT().
		ContainerInspect(gomock.Any(), "offline-container").
		Return(types.ContainerJSON{}, errors.New("container not found")).
		AnyTimes()

	// Create endpoint for offline container
	endpointRequest := handler.EndpointRequest{
		ContainerID:   "offline-container",
		TargetPort:    "8080",
		ExpectedState: "online",
	}

	// Execute endpoint creation
	actualResponse := env.postEndpoint(endpointRequest)

	// Verify endpoint configuration was saved with expected state online
	assert.Equal(t, "offline-container:8080", actualResponse.ID)
	assert.Equal(t, "offline-container", actualResponse.ContainerID)
	assert.Equal(t, "8080", actualResponse.TargetPort)

	// Verify persistent state has endpoint with expectedState=online
	state, err := env.Store.Load()
	if assert.NoError(t, err) {
		endpointConfig, exists := state.EndpointConfigs["offline-container:8080"]
		if assert.True(t, exists, "Endpoint should be saved in state") {
			assert.Equal(t, "online", endpointConfig.ExpectedState, "Endpoint expected state should be online")
		}
	}

	// Verify the endpoint response includes status information
	assert.Equal(t, "online", actualResponse.ExpectedState, "Endpoint expected state should be online")
	assert.Equal(t, manager.EndpointStateOnline, actualResponse.Status.State, "Endpoint should be online despite container being offline")
	assert.Equal(t, "https://offline-container-8080.ngrok.io", actualResponse.Status.URL)
	assert.Contains(t, actualResponse.Status.LastError, "", "Error should mention container issue")
}
