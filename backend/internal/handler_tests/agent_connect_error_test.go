package handler_tests

import (
	"errors"
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPutAgent_OfflineToOnline_ConnectError(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment without standard expectations
	env := setupTestEnvironment(t, ctrl)

	// Configure precise mock expectations for this test
	env.expectNewAgent().Times(1)
	// Agent.Connect() should return an error
	connectError := errors.New("connection failed")
	env.MockAgent.EXPECT().
		Connect(gomock.Any()).
		Return(connectError).
		Times(1)

	// Start with agent configured but offline
	initialConfig := store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "offline", // Key: starting offline
	}
	env.putAgent(initialConfig)

	// Now change expectedState to online - this should trigger Connect() which fails
	updatedConfig := store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online", // Key: changing to online
	}
	actualResponse := env.putAgent(updatedConfig)

	// Verify response shows expected state is online but actual status is offline with error
	assert.Equal(t, "ngrok_test_token", actualResponse.AuthToken)
	assert.Equal(t, "online", actualResponse.ExpectedState, "Expected state should be online as requested")
	assert.Equal(t, manager.AgentStateOffline, actualResponse.Status.State, "Actual status should be offline due to connection error")
	assert.Equal(t, "connection failed", actualResponse.Status.LastError, "Last error should contain the connection error")

	// Verify state was persisted with online expected state (despite connection failure)
	env.expectState(store.State{
		AgentConfig: store.AgentConfig{
			AuthToken:     "ngrok_test_token",
			ExpectedState: "online",
		},
		Version: 1,
	})
}
