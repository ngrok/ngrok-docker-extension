package handler_tests

import (
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPutAgent_OnlineIdenticalConfig_ExpectNoConnect(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)

	// Configure precise mock expectations for this test
	env.expectNewAgent().AnyTimes()
	env.expectAgentConnect().Times(1)
	env.expectAgentDisconnect().Times(0)

	// First, get the agent online
	initialConfig := store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ConnectURL:    "https://connect.ngrok-agent.com",
		ExpectedState: "online",
	}
	env.putAgent(initialConfig) // This first call should trigger Connect()

	// Make the same request again with identical config
	actualResponse := env.putAgent(initialConfig)

	// Verify response shows agent is still online with same config
	assert.Equal(t, "ngrok_test_token", actualResponse.AuthToken)
	assert.Equal(t, "https://connect.ngrok-agent.com", actualResponse.ConnectURL)
	assert.Equal(t, "online", actualResponse.ExpectedState)
	assert.Equal(t, manager.AgentStateOnline, actualResponse.Status.State)
	assert.Equal(t, "", actualResponse.Status.LastError)

	// Verify state is unchanged
	env.expectState(store.State{
		AgentConfig: store.AgentConfig{
			AuthToken:     "ngrok_test_token",
			ConnectURL:    "https://connect.ngrok-agent.com",
			ExpectedState: "online",
		},
		Version: 1,
	})
}
