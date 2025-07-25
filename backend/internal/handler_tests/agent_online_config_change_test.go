package handler_tests

import (
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPutAgent_OnlineConfigChange_ExpectReconnect(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment with shared helpers
	env := setupTestEnvironment(t, ctrl)

	// Configure precise mock expectations for this test
	env.expectNewAgent().AnyTimes()
	firstConnect := env.expectAgentConnectWithCtx() // Initial connect
	env.expectAgentConnectWithCtx() // Reconnect after config change

	// STEP 1: Create initial agent configuration using shared helper
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token_preset",
		ExpectedState: "online",
	})

	// STEP 2: Update agent configuration with different values
	actualResponse := env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_updated_token",
		ConnectURL:    "https://connect.ngrok-agent.com",
		ExpectedState: "online",
	})

	// Verify that the first context was canceled due to config change
	assert.True(t, firstConnect.Context.WasCanceled(), "First connect context should be canceled when config changes")

	// Verify response fields directly
	assert.Equal(t, "ngrok_updated_token", actualResponse.AuthToken)
	assert.Equal(t, "online", actualResponse.ExpectedState)
	assert.Equal(t, manager.EndpointStateOnline, actualResponse.Status.State)
	assert.Equal(t, "", actualResponse.Status.LastError)
	assert.NotZero(t, actualResponse.Status.ConnectedAt)

	// STEP 3: Verify updated state was persisted (NOT original)
	env.expectState(store.State{
		AgentConfig: store.AgentConfig{
			AuthToken:     "ngrok_updated_token",
			ConnectURL:    "https://connect.ngrok-agent.com",
			ExpectedState: "online",
		},
		Version: 1,
	})
}
