package handler_tests

import (
	"errors"
	"testing"

	"github.com/ngrok/ngrok-docker-extension/internal/manager"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPutAgent_OnlineWithNewToken_ConnectError(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment without standard expectations
	env := setupTestEnvironment(t, ctrl)

	// Configure mock expectations for initial agent setup (successful)
	env.expectNewAgent().Times(1)
	env.expectAgentConnect().Times(1) // This first connect succeeds

	// Start with agent configured and online
	initialConfig := store.AgentConfig{
		AuthToken:     "ngrok_old_token",
		ExpectedState: "online", // Key: starting online
	}
	env.putAgent(initialConfig)

	// Configure expectations for config change (requires reconnect)
	env.expectNewAgent().Times(1) // Create new agent with new token
	// Agent.Connect() should return an error on reconnect
	connectError := errors.New("reconnection failed")
	env.MockAgent.EXPECT().
		Connect(gomock.Any()).
		Return(connectError).
		Times(1)

	// Now change authToken while expectedState remains online - this should trigger reconnect which fails
	updatedConfig := store.AgentConfig{
		AuthToken:     "ngrok_new_token", // Key: different auth token
		ExpectedState: "online",          // Key: still online
	}
	actualResponse := env.putAgent(updatedConfig)

	// Verify response shows expected state is online but actual status is offline with error
	assert.Equal(t, "ngrok_new_token", actualResponse.AuthToken, "Auth token should be updated to new value")
	assert.Equal(t, "online", actualResponse.ExpectedState, "Expected state should remain online as requested")
	assert.Equal(t, manager.AgentStateOffline, actualResponse.Status.State, "Actual status should be offline due to reconnection error")
	assert.Equal(t, "reconnection failed", actualResponse.Status.LastError, "Last error should contain the reconnection error")

	// Verify state was persisted with new token and online expected state (despite connection failure)
	env.expectState(store.State{
		AgentConfig: store.AgentConfig{
			AuthToken:     "ngrok_new_token",
			ExpectedState: "online",
		},
		Version: 1,
	})
}
