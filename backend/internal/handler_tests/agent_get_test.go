package handler_tests

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestGetAgent_AgentWithRuntimeStatus(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment with shared helpers
	env := setupTestEnvironment(t, ctrl)
	env.setupStandardMockExpectations()

	// Pre-create agent state using shared helper
	expectedAgentConfig := store.AgentConfig{
		AuthToken:     "ngrok_test_token_preset",
		ExpectedState: "online",
	}
	env.putAgent(expectedAgentConfig)

	// Now test GET /agent to verify persistence and runtime status
	var actualResponse handler.AgentResponse
	_ = env.apiRequest(&APIRequest{
		Method:       http.MethodGet,
		Path:         "/agent",
		RequestBody:  nil,
		ResponseBody: &actualResponse,
		ExpectedCode: http.StatusOK,
	})

	// Verify response fields directly
	assert.Equal(t, expectedAgentConfig.AuthToken, actualResponse.AuthToken,
		"GET should return persisted auth token")
	assert.Equal(t, expectedAgentConfig.ExpectedState, actualResponse.ExpectedState,
		"GET should return persisted expected state")
	assert.Equal(t, "", actualResponse.Status.LastError,
		"GET should return current error state")
	assert.NotZero(t, actualResponse.Status.ConnectedAt,
		"GET should include valid connection timestamp")
}
