package handler



// Auth Handler Types
type AuthRequest struct {
	Token string `json:"token"`
}

type AuthResponse struct {
	// Empty response body - success/failure communicated via HTTP status
}

// Progress Handler Types
type ProgressRequest struct {
	// No input needed
}

type ProgressResponse struct {
	Endpoints []Endpoint `json:"endpoints"`
}

type Endpoint struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

// Remove Handler Types
type RemoveRequest struct {
	ContainerID string `json:"containerId"`
}

type RemoveResponse struct {
	RemainingEndpoints []Endpoint `json:"remainingEndpoints"`
}

// Start Handler Types
type StartRequest struct {
	ContainerID     string  `json:"containerId"`
	Port            string  `json:"port"`
	Binding         *string `json:"binding,omitempty"`
	URL             *string `json:"url,omitempty"`
	PoolingEnabled  *bool   `json:"poolingEnabled,omitempty"`
	TrafficPolicy   *string `json:"trafficPolicy,omitempty"`
	Description     *string `json:"description,omitempty"`
	Metadata        *string `json:"metadata,omitempty"`
}

type StartResponse struct {
	Endpoint Endpoint `json:"endpoint"`
}

// Error Response (for HTTP error cases)
type ErrorResponse struct {
	Error string `json:"error"`
}
