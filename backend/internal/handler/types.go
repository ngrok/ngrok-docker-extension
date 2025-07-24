package handler



// Configure Agent Types
type ConfigureAgentRequest struct {
	Token          string `json:"token"`
	ConnectURL     string `json:"connectURL,omitempty"`
	AutoDisconnect *bool  `json:"autoDisconnect,omitempty"` // pointer to distinguish null from false
}

type ConfigureAgentResponse struct {
	// Empty response body - success/failure communicated via HTTP status
}

// List Endpoints Types
type ListEndpointsRequest struct {
	// No input needed
}

type ListEndpointsResponse struct {
	Endpoints []Endpoint `json:"endpoints"`
}

type Endpoint struct {
	ID          string `json:"id"`
	URL         string `json:"url"`
	ContainerID string `json:"containerId"`
	TargetPort  string `json:"targetPort"`
	LastStarted string `json:"lastStarted"`
}

// Remove Endpoint Types
type RemoveEndpointRequest struct {
	ContainerID string `json:"containerId"`
	TargetPort  string `json:"targetPort"`
}

type RemoveEndpointResponse struct {
	RemainingEndpoints []Endpoint `json:"remainingEndpoints"`
}

// Create Endpoint Types
type CreateEndpointRequest struct {
	ContainerID     string  `json:"containerId"`
	TargetPort      string  `json:"targetPort"`
	Binding         *string `json:"binding,omitempty"`
	URL             *string `json:"url,omitempty"`
	PoolingEnabled  *bool   `json:"poolingEnabled,omitempty"`
	TrafficPolicy   *string `json:"trafficPolicy,omitempty"`
	Description     *string `json:"description,omitempty"`
	Metadata        *string `json:"metadata,omitempty"`
}

type CreateEndpointResponse struct {
	Endpoint Endpoint `json:"endpoint"`
}

// Error Response (for HTTP error cases)
type ErrorResponse struct {
	Error string `json:"error"`
}

// Agent Status Types
type AgentStatusResponse struct {
	Status            string `json:"status"`
	Timestamp         string `json:"timestamp"`
	ConnectionLatency int64  `json:"connectionLatency"` // milliseconds
	LastError         string `json:"lastError"`
}

// Detect Protocol Types
type DetectProtocolRequest struct {
	ContainerID string `json:"container_id"`
	Port        string `json:"port"`
}

type DetectProtocolResponse struct {
	TCP   bool `json:"tcp"`
	HTTP  bool `json:"http"`
	HTTPS bool `json:"https"`
	TLS   bool `json:"tls"`
}
