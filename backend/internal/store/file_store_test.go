package store

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFileStore_SaveAndLoad(t *testing.T) {
	// Create temporary file for testing
	tempDir := t.TempDir()
	testPath := filepath.Join(tempDir, "test.json")

	// Create FileStore
	store := NewFileStore(testPath)

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

	// Verify file exists
	_, err = os.Stat(testPath)
	require.NoError(t, err, "File should exist after save")

	// Load state
	loadedState, err := store.Load()
	require.NoError(t, err)

	// Verify state matches
	assert.Equal(t, testState, loadedState)
}

func TestFileStore_LoadNonExistentFile(t *testing.T) {
	// Create temporary directory but don't create the file
	tempDir := t.TempDir()
	testPath := filepath.Join(tempDir, "nonexistent.json")

	// Create FileStore
	store := NewFileStore(testPath)

	// Load state from non-existent file
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

func TestFileStore_Update(t *testing.T) {
	// Create temporary file for testing
	tempDir := t.TempDir()
	testPath := filepath.Join(tempDir, "test.json")

	// Create FileStore
	store := NewFileStore(testPath)

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
