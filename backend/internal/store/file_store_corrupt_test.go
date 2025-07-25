package store

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFileStore_CorruptState(t *testing.T) {
	tests := []struct {
		name           string
		fileContent    string
		expectedLogMsg string
		description    string
	}{
		{
			name:           "corrupt_json_file",
			fileContent:    `{"agentConfig": invalid json content}`,
			expectedLogMsg: "Corrupt state file detected",
			description:    "A corrupt statefile (not JSON)",
		},
		{
			name: "json_wrong_structure",
			fileContent: `{
				"agentConfig": "this should be an object not a string",
				"endpointConfigs": {},
				"version": 1
			}`,
			expectedLogMsg: "Corrupt state file detected",
			description:    "A statefile with JSON that does not match what we're deserializing",
		},
		{
			name: "json_wrong_structure_unexpected_version",
			fileContent: `{
				"agentConfig": "this should be an object not a string", 
				"endpointConfigs": {},
				"version": 999
			}`,
			expectedLogMsg: "Corrupt state file detected",
			description:    "A statefile with JSON that does not match what we're deserializing but an unexpected state version",
		},
		{
			name: "valid_json_unexpected_version",
			fileContent: `{
				"agentConfig": {
					"authToken": "test",
					"connectURL": "",
					"expectedState": "offline"
				},
				"endpointConfigs": {},
				"version": 999
			}`,
			expectedLogMsg: "Unsupported state version",
			description:    "A statefile with JSON that does match what we're deserializing but an unexpected state version",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temp directory and file
			tempDir := t.TempDir()
			testPath := filepath.Join(tempDir, "state.json")

			// Write corrupt content to file
			err := os.WriteFile(testPath, []byte(tt.fileContent), 0600)
			require.NoError(t, err)

			// Create buffer to capture log output
			var logBuffer bytes.Buffer
			logger := slog.New(slog.NewTextHandler(&logBuffer, &slog.HandlerOptions{
				Level: slog.LevelDebug,
			}))

			// Create FileStore with custom logger
			store := NewFileStoreWithLogger(testPath, logger)

			// Load state - should recover gracefully
			state, err := store.Load()
			require.NoError(t, err, "Load should not return error, should recover gracefully")

			// Verify returned state is the default state
			expectedState := &State{
				AgentConfig:     AgentConfig{},
				EndpointConfigs: make(map[string]EndpointConfig),
				Version:         1,
			}
			assert.Equal(t, expectedState, state, "Should return default state after corruption")

			// Verify log message was written
			logOutput := logBuffer.String()
			assert.Contains(t, logOutput, tt.expectedLogMsg, "Expected log message should be present")

			// Verify file was reset to valid JSON
			data, err := os.ReadFile(testPath)
			require.NoError(t, err)

			// Should be able to parse as valid JSON now
			var resetState State
			err = json.Unmarshal(data, &resetState)
			assert.NoError(t, err, "File should contain valid JSON after recovery")
			assert.Equal(t, 1, resetState.Version, "Reset file should have version 1")

			t.Logf("Test '%s' completed: %s", tt.name, tt.description)
		})
	}
}
