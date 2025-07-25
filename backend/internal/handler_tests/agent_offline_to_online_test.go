package handler_tests

import (
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPutAgent_OfflineToOnline_ExpectConnect(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment without standard expectations
	env := setupTestEnvironment(t, ctrl)

	// Configure precise mock expectations for this test
	env.expectNewAgent().AnyTimes()
	env.expectAgentConnect().Times(1)
	env.expectAgentDisconnect().Times(0)

	// Start with agent configured but offline
	initialConfig := store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "offline", // Key: starting offline
	}
	env.putAgent(initialConfig)

	// Now change expectedState to online - this should trigger Connect()
	updatedConfig := store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online", // Key: changing to online
	}
	actualResponse := env.putAgent(updatedConfig)

	// Verify response shows agent is now online
	assert.Equal(t, "ngrok_test_token", actualResponse.AuthToken)
	assert.Equal(t, "online", actualResponse.ExpectedState)
	assert.Equal(t, manager.EndpointStateOnline, actualResponse.Status.State)
	assert.Equal(t, "", actualResponse.Status.LastError)

	// Verify state was persisted with online expected state
	env.expectState(store.State{
		AgentConfig: store.AgentConfig{
			AuthToken:     "ngrok_test_token",
			ExpectedState: "online",
		},
		Version: 1,
	})
}
