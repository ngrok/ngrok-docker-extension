package handler_tests

import (
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPutAgent_OfflineToOffline_ExpectNoSDKCalls(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)

	// Configure precise mock expectations for this test
	env.expectNewAgent().AnyTimes()
	env.expectAgentConnect().Times(0)
	env.expectAgentDisconnect().Times(0)

	// Start with agent configured and offline
	initialConfig := store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "offline", // Key: starting offline
	}
	env.putAgent(initialConfig)

	// Update agent config but keep expectedState offline - should not trigger any SDK calls
	updatedConfig := store.AgentConfig{
		AuthToken:     "ngrok_updated_token", // Change token but keep offline
		ExpectedState: "offline",             // Key: staying offline
	}
	actualResponse := env.putAgent(updatedConfig)

	// Verify response shows updated config but agent still offline
	assert.Equal(t, "ngrok_updated_token", actualResponse.AuthToken)
	assert.Equal(t, "offline", actualResponse.ExpectedState)
	assert.Equal(t, manager.AgentStateOffline, actualResponse.Status.State)

	// Verify state was persisted with updated config
	env.expectState(store.State{
		AgentConfig: store.AgentConfig{
			AuthToken:     "ngrok_updated_token",
			ExpectedState: "offline",
		},
		Version: 1,
	})
}
