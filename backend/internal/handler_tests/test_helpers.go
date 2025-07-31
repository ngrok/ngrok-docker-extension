package handler_tests

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"testing"

	"github.com/docker/docker/api/types"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/detectproto"
	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"github.com/ngrok/ngrok-docker-extension/internal/manager/mocks"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

// TestEnv contains all the setup needed for handler tests
type TestEnv struct {
	T                    *testing.T
	Echo                 *echo.Echo
	Store                store.Store
	Manager              manager.Manager
	MockNgrok            *mocks.MockNgrokSDK
	MockDocker           *mocks.MockDockerClient
	MockProtocolDetector *mocks.MockProtocolDetector
	MockAgent            *mocks.MockAgent
}

// setupTestEnvironment creates a complete test environment with all mocks configured
func setupTestEnvironment(t *testing.T, ctrl *gomock.Controller) *TestEnv {
	// Setup Echo instance
	e := echo.New()

	// Create MemoryStore for testing
	memoryStore := store.NewMemoryStore(nil)

	// Create real components with mocked dependencies
	mockNgrok := mocks.NewMockNgrokSDK(ctrl)
	mockDocker := mocks.NewMockDockerClient(ctrl)
	mockProtocolDetector := mocks.NewMockProtocolDetector(ctrl)
	mockAgent := mocks.NewMockAgent(ctrl)
	slogger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	// Construct manager using constructor (now uses slog.Logger)
	// Use 0 interval to disable converge loop in tests
	mgr := manager.NewManager(memoryStore, mockNgrok, mockDocker, mockProtocolDetector, slogger, "test-extension-version", 0)

	// Create handler using New (will register routes automatically)
	_ = handler.New(e, mgr, memoryStore, slogger)

	return &TestEnv{
		T:                    t,
		Echo:                 e,
		Store:                memoryStore,
		Manager:              mgr,
		MockNgrok:            mockNgrok,
		MockDocker:           mockDocker,
		MockProtocolDetector: mockProtocolDetector,
		MockAgent:            mockAgent,
	}
}

// makeJSONRequest creates a JSON request body from any object
func makeJSONRequest(t *testing.T, data interface{}) []byte {
	body, err := json.Marshal(data)
	require.NoError(t, err, "Should be able to marshal request data to JSON")
	return body
}

// jsonUnmarshal unmarshals JSON data with proper error handling
func jsonUnmarshal(t *testing.T, data []byte, v interface{}) error {
	err := json.Unmarshal(data, v)
	require.NoError(t, err, "Should be able to unmarshal JSON response")
	return err
}

// APIRequest defines parameters for making HTTP API requests in tests
type APIRequest struct {
	Method       string      // HTTP method (GET, POST, PUT, etc.)
	Path         string      // URL path
	RequestBody  interface{} // Request body to marshal to JSON (nil for no body)
	ResponseBody interface{} // Response body to unmarshal JSON into (must be pointer)
	ExpectedCode int         // Expected HTTP status code
}

// apiRequest makes an HTTP request with optional JSON body, executes it, and unmarshals the response
func (env *TestEnv) apiRequest(req *APIRequest) *httptest.ResponseRecorder {
	var body []byte

	// Create request body if provided
	if req.RequestBody != nil {
		body = makeJSONRequest(env.T, req.RequestBody)
	}

	// Create HTTP request
	var reqBody io.Reader
	if req.RequestBody != nil {
		reqBody = bytes.NewReader(body)
	}
	httpReq := httptest.NewRequest(req.Method, req.Path, reqBody)
	if req.RequestBody != nil {
		httpReq.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()

	// Execute request
	env.Echo.ServeHTTP(rec, httpReq)

	// Assert expected status code if provided
	if req.ExpectedCode != 0 {
		assert.Equal(env.T, req.ExpectedCode, rec.Code, "Expected HTTP status code to match")
	}

	// Unmarshal response if ResponseBody is provided and there's content
	if req.ResponseBody != nil && rec.Body.Len() > 0 {
		jsonUnmarshal(env.T, rec.Body.Bytes(), req.ResponseBody)
	}

	return rec
}

// expectDockerContainer sets up mock expectations for Docker container inspection
func (env *TestEnv) expectDockerContainer(name string, running bool) {
	env.MockDocker.EXPECT().
		ContainerInspect(gomock.Any(), name).
		Return(types.ContainerJSON{
			ContainerJSONBase: &types.ContainerJSONBase{
				State: &types.ContainerState{
					Running: running,
				},
			},
		}, nil).
		AnyTimes()
}

// expectState loads the current state from Store and asserts it matches the expected state
func (env *TestEnv) expectState(expected store.State) {
	state, err := env.Store.Load()
	if assert.NoError(env.T, err, "Store.Load should work when implemented") {
		// Normalize nil and empty maps for comparison
		normalizedExpected := normalizeState(expected)
		normalizedActual := normalizeState(*state)
		assert.Equal(env.T, normalizedExpected, normalizedActual, "Store state should match expected state")
	}
}

// normalizeState ensures nil and empty EndpointConfigs maps are treated as equivalent
func normalizeState(state store.State) store.State {
	normalized := state
	if normalized.EndpointConfigs == nil {
		normalized.EndpointConfigs = make(map[string]store.EndpointConfig)
	}
	return normalized
}

// putAgent creates an agent configuration using PUT /agent endpoint
func (env *TestEnv) putAgent(config store.AgentConfig) *handler.AgentResponse {
	var response handler.AgentResponse
	env.apiRequest(&APIRequest{
		Method:       http.MethodPut,
		Path:         "/agent",
		RequestBody:  config,
		ResponseBody: &response,
		ExpectedCode: http.StatusOK,
	})
	return &response
}

// getAgent gets the current agent configuration and status using GET /agent endpoint
func (env *TestEnv) getAgent() *handler.AgentResponse {
	var response handler.AgentResponse
	env.apiRequest(&APIRequest{
		Method:       http.MethodGet,
		Path:         "/agent",
		ResponseBody: &response,
		ExpectedCode: http.StatusOK,
	})
	return &response
}

// postEndpoint creates an endpoint using POST /endpoints endpoint
func (env *TestEnv) postEndpoint(req handler.EndpointRequest) *handler.EndpointResponse {
	var response handler.EndpointResponse
	env.apiRequest(&APIRequest{
		Method:       http.MethodPost,
		Path:         "/endpoints",
		RequestBody:  req,
		ResponseBody: &response,
		ExpectedCode: http.StatusCreated,
	})
	return &response
}

// putEndpoint updates an endpoint using PUT /endpoints/:id endpoint
func (env *TestEnv) putEndpoint(endpointID string, req handler.EndpointRequest) *handler.EndpointResponse {
	var response handler.EndpointResponse
	env.apiRequest(&APIRequest{
		Method:       http.MethodPut,
		Path:         "/endpoints/" + endpointID,
		RequestBody:  req,
		ResponseBody: &response,
		ExpectedCode: http.StatusOK,
	})
	return &response
}

// getEndpoints gets all endpoints using GET /endpoints
func (env *TestEnv) getEndpoints() *handler.GetEndpointsResponse {
	var response handler.GetEndpointsResponse
	env.apiRequest(&APIRequest{
		Method:       http.MethodGet,
		Path:         "/endpoints",
		ResponseBody: &response,
		ExpectedCode: http.StatusOK,
	})
	return &response
}

// getEndpointByID gets a specific endpoint using GET /endpoints/:id
func (env *TestEnv) getEndpointByID(endpointID string) *handler.EndpointResponse {
	var response handler.EndpointResponse
	env.apiRequest(&APIRequest{
		Method:       http.MethodGet,
		Path:         "/endpoints/" + endpointID,
		ResponseBody: &response,
		ExpectedCode: http.StatusOK,
	})
	return &response
}

// getEndpointByIDExpectingError gets a specific endpoint using GET /endpoints/:id, expecting an error status
func (env *TestEnv) getEndpointByIDExpectingError(endpointID string, expectedCode int) map[string]string {
	var errorResponse map[string]string
	env.apiRequest(&APIRequest{
		Method:       http.MethodGet,
		Path:         "/endpoints/" + endpointID,
		ResponseBody: &errorResponse,
		ExpectedCode: expectedCode,
	})
	return errorResponse
}

// deleteEndpoint deletes an endpoint using DELETE /endpoints/:id
func (env *TestEnv) deleteEndpoint(endpointID string) {
	env.apiRequest(&APIRequest{
		Method:       http.MethodDelete,
		Path:         "/endpoints/" + endpointID,
		ExpectedCode: http.StatusNoContent,
	})
}

// deleteEndpointExpectingError deletes an endpoint using DELETE /endpoints/:id, expecting an error status
func (env *TestEnv) deleteEndpointExpectingError(endpointID string, expectedCode int) map[string]string {
	var errorResponse map[string]string
	env.apiRequest(&APIRequest{
		Method:       http.MethodDelete,
		Path:         "/endpoints/" + endpointID,
		ResponseBody: &errorResponse,
		ExpectedCode: expectedCode,
	})
	return errorResponse
}

// setupStandardMockExpectations configures the standard mock expectations for ngrok SDK operations
func (env *TestEnv) setupStandardMockExpectations() {
	env.MockNgrok.EXPECT().
		NewAgent(gomock.Any()).
		Return(env.MockAgent, nil).
		AnyTimes()

	env.MockAgent.EXPECT().
		Connect(gomock.Any()).
		Return(nil).
		AnyTimes()

	env.MockAgent.EXPECT().
		Disconnect().
		Return(nil).
		AnyTimes()

	env.expectHTTPProtocolDetection()
}

func (env *TestEnv) expectHTTPProtocolDetection() {
	env.MockProtocolDetector.EXPECT().
		Detect(gomock.Any(), gomock.Any(), gomock.Any()).
		Return(&detectproto.Result{
			TCP:   true,
			HTTP:  true,
			HTTPS: false,
			TLS:   false,
		}, nil).
		AnyTimes()
}

func (env *TestEnv) expectTLSProtocolDetection() {
	env.MockProtocolDetector.EXPECT().
		Detect(gomock.Any(), gomock.Any(), gomock.Any()).
		Return(&detectproto.Result{
			TCP:   true,
			HTTP:  true,
			HTTPS: true,
			TLS:   true,
		}, nil).
		AnyTimes()
}

// expectNewAgent sets up expectation for NewAgent call - caller can chain .Times() etc.
func (env *TestEnv) expectNewAgent() *gomock.Call {
	return env.MockNgrok.EXPECT().
		NewAgent(gomock.Any()).
		Return(env.MockAgent, nil)
}

// expectAgentConnect sets up expectation for Agent.Connect() call - caller can chain .Times() etc.
func (env *TestEnv) expectAgentConnect() *gomock.Call {
	return env.MockAgent.EXPECT().
		Connect(gomock.Any()).
		Return(nil)
}

// CapturedContext holds a captured context for later verification
type CapturedContext struct {
	ctx context.Context
}

// WasCanceled checks if the captured context was canceled
func (cc *CapturedContext) WasCanceled() bool {
	if cc.ctx == nil {
		return false
	}
	select {
	case <-cc.ctx.Done():
		return true
	default:
		return false
	}
}

// CapturedCall holds both the captured context and the gomock Call for method chaining
type CapturedCall struct {
	Context *CapturedContext
	Call    *gomock.Call
}

// expectAgentConnectWithCtx sets up expectation for Agent.Connect() and captures the context for cancellation checking
func (env *TestEnv) expectAgentConnectWithCtx() *CapturedCall {
	captured := &CapturedContext{}
	call := env.MockAgent.EXPECT().
		Connect(gomock.Any()).
		Do(func(ctx context.Context) {
			captured.ctx = ctx
		}).
		Return(nil)
	return &CapturedCall{
		Context: captured,
		Call:    call,
	}
}

// expectAgentDisconnect sets up expectation for Agent.Disconnect() call - caller can chain .Times() etc.
func (env *TestEnv) expectAgentDisconnect() *gomock.Call {
	return env.MockAgent.EXPECT().
		Disconnect().
		Return(nil)
}

// expectAgentForward sets up expectation for Agent.Forward() call - caller can chain .Return(), .Times() etc.
func (env *TestEnv) expectAgentForward() *gomock.Call {
	return env.MockAgent.EXPECT().
		Forward(gomock.Any(), gomock.Any(), gomock.Any())
}

// createMockForwarder creates a mock EndpointForwarder with the given URL and ID
func (env *TestEnv) createMockForwarder(ctrl *gomock.Controller, urlStr, id string) *mocks.MockEndpointForwarder {
	mockForwarder := mocks.NewMockEndpointForwarder(ctrl)
	expectedURL, _ := url.Parse(urlStr)
	mockForwarder.EXPECT().URL().Return(expectedURL).AnyTimes()
	mockForwarder.EXPECT().ID().Return(id).AnyTimes()
	return mockForwarder
}
