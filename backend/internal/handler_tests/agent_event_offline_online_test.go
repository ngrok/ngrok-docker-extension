package handler_tests

import (
	"errors"
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
	ngrok "golang.ngrok.com/ngrok/v2"

	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestAgentEventHandling_OfflineToOnline_ClearsLastError(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)
	env.setupStandardMockExpectations()

	// Cast manager to test interface to access test method
	testHandler, ok := env.Manager.(manager.TestEventHandler)
	if !ok {
		t.Fatalf("Manager does not implement TestEventHandler interface")
	}

	// Configure agent to be online
	agentConfig := store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	}
	env.putAgent(agentConfig)

	// Verify initial status is online with no error
	initialStatus := env.getAgent()
	assert.Equal(t, manager.AgentStateOnline, initialStatus.Status.State)
	assert.Equal(t, "", initialStatus.Status.LastError)

	// Simulate agent unexpectedly going offline with an error
	disconnectEvent := &ngrok.EventAgentDisconnected{
		Error: errors.New("connection lost"),
	}
	testHandler.CallNgrokEventHandlerForTests(disconnectEvent)

	// Check status shows offline with error
	offlineStatus := env.getAgent()
	assert.Equal(t, "connecting", offlineStatus.Status.State)
	assert.Equal(t, "connection lost", offlineStatus.Status.LastError)

	// Simulate agent coming back online
	connectEvent := &ngrok.EventAgentConnectSucceeded{}
	testHandler.CallNgrokEventHandlerForTests(connectEvent)

	// Check status shows online with error cleared
	onlineStatus := env.getAgent()
	assert.Equal(t, manager.AgentStateOnline, onlineStatus.Status.State)
	assert.Equal(t, "", onlineStatus.Status.LastError) // LastError should be cleared
}

func TestAgentEventHandling_OfflineToOnline_NoError(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)
	env.setupStandardMockExpectations()

	// Cast manager to test interface to access test method
	testHandler, ok := env.Manager.(manager.TestEventHandler)
	if !ok {
		t.Fatalf("Manager does not implement TestEventHandler interface")
	}

	// Configure agent to be online
	agentConfig := store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	}
	env.putAgent(agentConfig)

	// Simulate agent going offline gracefully (no error)
	disconnectEvent := &ngrok.EventAgentDisconnected{
		Error: nil, // No error for graceful disconnect
	}
	testHandler.CallNgrokEventHandlerForTests(disconnectEvent)

	// Check status shows offline with no error
	offlineStatus := env.getAgent()
	assert.Equal(t, manager.AgentStateOffline, offlineStatus.Status.State)
	assert.Equal(t, "", offlineStatus.Status.LastError)

	// Simulate agent coming back online
	connectEvent := &ngrok.EventAgentConnectSucceeded{}
	testHandler.CallNgrokEventHandlerForTests(connectEvent)

	// Check status shows online with no error
	onlineStatus := env.getAgent()
	assert.Equal(t, manager.AgentStateOnline, onlineStatus.Status.State)
	assert.Equal(t, "", onlineStatus.Status.LastError)
}
