package handler



// Configure Agent Types
type ConfigureAgentRequest struct {
	Token string `json:"token"`
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
	ID  string `json:"id"`
	URL string `json:"url"`
}

// Remove Endpoint Types
type RemoveEndpointRequest struct {
	ContainerID string `json:"containerId"`
}

type RemoveEndpointResponse struct {
	RemainingEndpoints []Endpoint `json:"remainingEndpoints"`
}

// Create Endpoint Types
type CreateEndpointRequest struct {
	ContainerID     string  `json:"containerId"`
	Port            string  `json:"port"`
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
