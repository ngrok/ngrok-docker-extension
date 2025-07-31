package handler_tests

import (
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPutAgent_OnlineToOffline_ExpectDisconnect(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)

	// Configure precise mock expectations for this test
	env.expectNewAgent().AnyTimes()
	connect := env.expectAgentConnectWithCtx()

	// First, get the agent online
	initialConfig := store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	}
	env.putAgent(initialConfig)

	// Change expectedState to offline - this should trigger Disconnect()
	updatedConfig := store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "offline", // Key: changing to offline
	}
	actualResponse := env.putAgent(updatedConfig)

	// Verify that the connect context was canceled when switching to offline
	assert.True(t, connect.Context.WasCanceled(), "Connect context should be canceled when switching to offline")

	// Verify response shows agent is now offline
	assert.Equal(t, "ngrok_test_token", actualResponse.AuthToken)
	assert.Equal(t, "offline", actualResponse.ExpectedState)
	assert.Equal(t, manager.AgentStateOffline, actualResponse.Status.State)
	assert.Equal(t, "", actualResponse.Status.LastError)

	// Verify state was persisted with offline expected state
	env.expectState(store.State{
		AgentConfig: store.AgentConfig{
			AuthToken:     "ngrok_test_token",
			ExpectedState: "offline",
		},
		Version: 1,
	})
}
