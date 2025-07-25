package handler_tests

import (
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPutAgent_CreateInitialConfiguration(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment with shared helpers
	env := setupTestEnvironment(t, ctrl)
	env.setupStandardMockExpectations()

	// Prepare request body using actual type
	agentConfig := store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	}

	// Execute request using helper
	actualResponse := env.putAgent(agentConfig)

	// Verify response fields directly
	assert.Equal(t, "ngrok_test_token", actualResponse.AuthToken)
	assert.Equal(t, "online", actualResponse.ExpectedState)
	assert.Equal(t, manager.AgentStateOnline, actualResponse.Status.State)
	assert.Equal(t, "", actualResponse.Status.LastError)
	assert.NotZero(t, actualResponse.Status.ConnectedAt)

	// Verify state was persisted
	env.expectState(store.State{
		AgentConfig: store.AgentConfig{
			AuthToken:     "ngrok_test_token",
			ExpectedState: "online",
		},
		EndpointConfigs: make(map[string]store.EndpointConfig),
		Version:         1,
	})
}
