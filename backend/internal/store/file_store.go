package store

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
)

type FileStore struct {
	path   string
	logger *slog.Logger
	mu     sync.RWMutex
}

func NewFileStore(path string) *FileStore {
	return &FileStore{
		path:   path,
		logger: slog.Default(),
		mu:     sync.RWMutex{},
	}
}

func NewFileStoreWithLogger(path string, logger *slog.Logger) *FileStore {
	return &FileStore{
		path:   path,
		logger: logger,
		mu:     sync.RWMutex{},
	}
}

func (s *FileStore) Load() (*State, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.loadUnsafe()
}

func (s *FileStore) Save(state *State) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.saveUnsafe(state)
}

func (s *FileStore) Update(fn func(*State) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Load current state
	state, err := s.loadUnsafe()
	if err != nil {
		return err
	}

	// Apply update function
	if err := fn(state); err != nil {
		return err
	}

	// Save updated state
	return s.saveUnsafe(state)
}

// loadUnsafe loads state without acquiring mutex (for internal use)
func (s *FileStore) loadUnsafe() (*State, error) {
	// Read file from filesystem
	data, err := os.ReadFile(s.path)
	if err != nil {
		// Handle file not found - return empty state
		if errors.Is(err, fs.ErrNotExist) {
			return s.defaultState(), nil
		}
		s.logger.Error("Failed to read state file", "path", s.path, "error", err)
		return nil, err
	}

	// Parse JSON
	var state State
	if err := json.Unmarshal(data, &state); err != nil {
		s.logger.Warn("Corrupt state file detected, resetting to default state",
			"path", s.path, "error", err)
		return s.resetToDefaultState("corruption")
	}

	// Validate state version
	if state.Version != 1 {
		s.logger.Warn("Unsupported state version, resetting to default state",
			"path", s.path, "version", state.Version, "expected", 1)
		return s.resetToDefaultState("version mismatch")
	}

	return &state, nil
}

// defaultState returns a clean default state
func (s *FileStore) defaultState() *State {
	return &State{
		AgentConfig:     AgentConfig{},
		EndpointConfigs: make(map[string]EndpointConfig),
		Version:         1,
	}
}

// resetToDefaultState resets to default state and saves it, with error logging
func (s *FileStore) resetToDefaultState(reason string) (*State, error) {
	defaultState := s.defaultState()
	if saveErr := s.saveUnsafe(defaultState); saveErr != nil {
		s.logger.Error("Failed to save default state after "+reason,
			"path", s.path, "error", saveErr)
	}
	return defaultState, nil
}

// saveUnsafe saves state without acquiring mutex (for internal use)
func (s *FileStore) saveUnsafe(state *State) error {
	data, err := json.Marshal(state)
	if err != nil {
		return err
	}

	// Ensure directory exists
	dir := filepath.Dir(s.path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	// Write file atomically by writing to temp file first
	tempPath := s.path + ".tmp"
	if err := os.WriteFile(tempPath, data, 0600); err != nil {
		return err
	}

	// Atomic rename
	return os.Rename(tempPath, s.path)
}
