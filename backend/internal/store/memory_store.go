package store

import (
	"encoding/json"
	"sync"
)

// MemoryStore implements Store interface using in-memory storage
// This is primarily used for testing
type MemoryStore struct {
	state *State
	mu    sync.RWMutex
}

func NewMemoryStore(initialState *State) *MemoryStore {
	state := initialState
	if state == nil {
		state = &State{
			AgentConfig:     AgentConfig{},
			EndpointConfigs: make(map[string]EndpointConfig),
			Version:         1,
		}
	}

	return &MemoryStore{
		state: state,
		mu:    sync.RWMutex{},
	}
}

func (m *MemoryStore) Load() (*State, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Return a deep copy to prevent external mutations
	return deepCopyState(m.state)
}

func (m *MemoryStore) Save(state *State) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Store a deep copy to prevent external mutations
	stateCopy, err := deepCopyState(state)
	if err != nil {
		return err
	}

	m.state = stateCopy
	return nil
}

func (m *MemoryStore) Update(fn func(*State) error) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Create a deep copy for the update function
	stateCopy, err := deepCopyState(m.state)
	if err != nil {
		return err
	}

	// Apply update function
	if err := fn(stateCopy); err != nil {
		return err
	}

	// Store the updated copy
	m.state = stateCopy
	return nil
}

// deepCopyState creates a deep copy of a State using JSON marshaling/unmarshaling
func deepCopyState(state *State) (*State, error) {
	data, err := json.Marshal(state)
	if err != nil {
		return nil, err
	}

	var stateCopy State
	if err := json.Unmarshal(data, &stateCopy); err != nil {
		return nil, err
	}

	return &stateCopy, nil
}
