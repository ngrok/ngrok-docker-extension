package store

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMemoryStore_SaveAndLoad(t *testing.T) {
	// Create MemoryStore
	store := NewMemoryStore(nil)

	// Create test state
	testState := &State{
		AgentConfig: AgentConfig{
			AuthToken:     "test_token",
			ConnectURL:    "https://connect.ngrok.com",
			ExpectedState: "online",
		},
		EndpointConfigs: make(map[string]EndpointConfig),
		Version:         1,
	}

	// Save state
	err := store.Save(testState)
	require.NoError(t, err)

	// Load state
	loadedState, err := store.Load()
	require.NoError(t, err)

	// Verify state matches
	assert.Equal(t, testState, loadedState)
}

func TestMemoryStore_LoadEmptyState(t *testing.T) {
	// Create MemoryStore
	store := NewMemoryStore(nil)

	// Load initial state
	state, err := store.Load()
	require.NoError(t, err)

	// Should return empty state with version 1
	expectedState := &State{
		AgentConfig:     AgentConfig{},
		EndpointConfigs: make(map[string]EndpointConfig),
		Version:         1,
	}
	assert.Equal(t, expectedState, state)
}

func TestMemoryStore_Update(t *testing.T) {
	// Create MemoryStore
	store := NewMemoryStore(nil)

	// Update state using Update method
	err := store.Update(func(state *State) error {
		state.AgentConfig.AuthToken = "updated_token"
		return nil
	})
	require.NoError(t, err)

	// Load and verify the update
	state, err := store.Load()
	require.NoError(t, err)

	assert.Equal(t, "updated_token", state.AgentConfig.AuthToken)
}

func TestMemoryStore_Isolation(t *testing.T) {
	// Create MemoryStore
	store := NewMemoryStore(nil)

	// Load state and modify it externally
	state1, err := store.Load()
	require.NoError(t, err)

	// Modify the loaded state (should not affect stored state)
	state1.AgentConfig.AuthToken = "external_modification"

	// Load again and verify it wasn't affected
	state2, err := store.Load()
	require.NoError(t, err)

	assert.Empty(t, state2.AgentConfig.AuthToken, "External modification should not affect stored state")
	assert.NotEqual(t, state1.AgentConfig.AuthToken, state2.AgentConfig.AuthToken)
}
