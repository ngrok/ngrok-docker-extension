package store

// AgentConfig represents the desired agent configuration
type AgentConfig struct {
	AuthToken     string `json:"authToken"`
	ConnectURL    string `json:"connectURL,omitempty"`
	ExpectedState string `json:"expectedState"` // "online" | "offline"
}

// EndpointConfig represents the desired endpoint configuration
type EndpointConfig struct {
	ID             string `json:"id"` // containerID:targetPort
	ContainerID    string `json:"containerId"`
	TargetPort     string `json:"targetPort"`
	URL            string `json:"url,omitempty"`
	Binding        string `json:"binding,omitempty"`
	PoolingEnabled bool   `json:"poolingEnabled"`
	TrafficPolicy  string `json:"trafficPolicy,omitempty"`
	Description    string `json:"description,omitempty"`
	Metadata       string `json:"metadata,omitempty"`
	ExpectedState  string `json:"expectedState"`         // "online" | "offline"
	LastStarted    string `json:"lastStarted,omitempty"` // when endpoint was last started
}

// State is the root persistent state structure
type State struct {
	AgentConfig     AgentConfig               `json:"agentConfig"`
	EndpointConfigs map[string]EndpointConfig `json:"endpointConfigs"`
	Version         int                       `json:"version"`
}

// Store provides atomic persistence operations
type Store interface {
	Load() (*State, error)
	Save(*State) error
	Update(func(*State) error) error
}
