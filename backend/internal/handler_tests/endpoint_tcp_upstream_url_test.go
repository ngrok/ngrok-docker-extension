package handler_tests

import (
	"fmt"
	"net/url"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/detectproto"
	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/manager/mocks"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPostEndpoints_UpstreamDefaultScheme(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment with shared helpers
	env := setupTestEnvironment(t, ctrl)

	// Create a mock EndpointForwarder
	mockForwarder := mocks.NewMockEndpointForwarder(ctrl)
	expectedURL, _ := url.Parse("https://test-123-8080.ngrok.io")

	// Setup forwarder expectations
	mockForwarder.EXPECT().URL().Return(expectedURL).AnyTimes()
	mockForwarder.EXPECT().ID().Return("endpoint-id-123").AnyTimes()

	// Setup agent expectations - agent should be created and connected
	env.expectNewAgent().Times(1)
	env.expectAgentConnect().Times(1)

	// Track what upstream URL is actually passed to Forward()
	var capturedUpstreamURL string

	// Use a custom expectation to capture and verify the upstream URL
	env.MockAgent.EXPECT().
		Forward(
			gomock.Any(), // context
			gomock.Any(), // upstream (we'll capture this)
			gomock.Any(), // options
		).
		Do(func(ctx interface{}, upstream interface{}, opts ...interface{}) {
			// Extract the upstream URL by parsing the string representation
			// The upstream struct has unexported fields, so we use string parsing
			upstreamStr := fmt.Sprintf("%+v", upstream)
			t.Logf("Forward called with upstream: %s", upstreamStr)

			if strings.Contains(upstreamStr, "addr:") {
				// Parse "addr:tcp://172.17.0.1:8080" or "addr:http://172.17.0.1:8080"
				parts := strings.Split(upstreamStr, "addr:")
				if len(parts) > 1 {
					addrPart := strings.Fields(parts[1])[0]
					capturedUpstreamURL = addrPart
				}
			}
			t.Logf("Captured upstream URL: %s", capturedUpstreamURL)
		}).
		Return(mockForwarder, nil).
		Times(1)

	// Pre-create agent configuration
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	})

	// Mock Docker to return container as available
	env.expectDockerContainer("test-container-123", true)

	// Mock protocol detector to return no TLS (TCP and HTTP)
	env.MockProtocolDetector.EXPECT().
		Detect(gomock.Any(), "172.17.0.1", "8080").
		Return(&detectproto.Result{
			TCP:   true,
			HTTP:  true,
			HTTPS: false,
			TLS:   false,
		}, nil).
		Times(1)

	// Create endpoint request - upstream should use host:port regardless of endpoint URL scheme
	endpointRequest := handler.EndpointRequest{
		ContainerID:   "test-container-123",
		TargetPort:    "8080",
		URL:           "https://test-123-8080.ngrok.io", // Endpoint URL scheme doesn't affect upstream
		ExpectedState: "online",
	}

	// Execute request
	actualResponse := env.postEndpoint(endpointRequest)

	// Verify the endpoint was created
	assert.Equal(t, "test-container-123:8080", actualResponse.ID)
	assert.Equal(t, "test-container-123", actualResponse.ContainerID)
	assert.Equal(t, "8080", actualResponse.TargetPort)

	// Log what we captured to understand the issue
	t.Logf("Captured upstream: %s", capturedUpstreamURL)

	// ASSERTION: Upstream should default to http scheme
	assert.Equal(t, "http://172.17.0.1:8080", capturedUpstreamURL,
		"Expected upstream URL to be default to http scheme")
}

func TestPostEndpoints_TLSDetection_HTTPSScheme(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment with shared helpers
	env := setupTestEnvironment(t, ctrl)

	// Create a mock EndpointForwarder for HTTPS
	mockForwarder := mocks.NewMockEndpointForwarder(ctrl)
	expectedURL, _ := url.Parse("https://test-123-8080.ngrok.io")

	// Setup forwarder expectations
	mockForwarder.EXPECT().URL().Return(expectedURL).AnyTimes()
	mockForwarder.EXPECT().ID().Return("endpoint-id-123").AnyTimes()

	// Setup agent expectations - agent should be created and connected
	env.expectNewAgent().Times(1)
	env.expectAgentConnect().Times(1)

	// Mock protocol detector to return TLS = true
	env.MockProtocolDetector.EXPECT().
		Detect(gomock.Any(), "172.17.0.1", "8080").
		Return(&detectproto.Result{
			TCP:   true,
			HTTP:  false,
			HTTPS: false,
			TLS:   true,
		}, nil).
		Times(1)

	// Track what upstream URL is actually passed to Forward()
	var capturedUpstreamURL string

	// Use a custom expectation to capture and verify the upstream URL
	env.MockAgent.EXPECT().
		Forward(
			gomock.Any(), // context
			gomock.Any(), // upstream (we'll capture this)
			gomock.Any(), // options
		).
		Do(func(ctx interface{}, upstream interface{}, opts ...interface{}) {
			// Extract the upstream URL by parsing the string representation
			upstreamStr := fmt.Sprintf("%+v", upstream)
			t.Logf("Forward called with upstream: %s", upstreamStr)

			if strings.Contains(upstreamStr, "addr:") {
				parts := strings.Split(upstreamStr, "addr:")
				if len(parts) > 1 {
					addrPart := strings.Fields(parts[1])[0]
					capturedUpstreamURL = addrPart
				}
			}
			t.Logf("Captured upstream URL: %s", capturedUpstreamURL)
		}).
		Return(mockForwarder, nil).
		Times(1)

	// Pre-create agent configuration
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	})

	// Mock Docker to return container as available
	env.expectDockerContainer("test-container-123", true)

	// Create endpoint request with HTTPS URL
	endpointRequest := handler.EndpointRequest{
		ContainerID:   "test-container-123",
		TargetPort:    "8080",
		URL:           "https://custom-https-endpoint.ngrok.io", // HTTPS scheme
		ExpectedState: "online",
	}

	// Execute request
	actualResponse := env.postEndpoint(endpointRequest)

	// Verify the endpoint was created
	assert.Equal(t, "test-container-123:8080", actualResponse.ID)
	assert.Equal(t, "test-container-123", actualResponse.ContainerID)
	assert.Equal(t, "8080", actualResponse.TargetPort)

	// ASSERTION: When TLS is detected and URL is https/http, upstream should use https scheme
	assert.Equal(t, "https://172.17.0.1:8080", capturedUpstreamURL,
		"Expected upstream URL to use https scheme when TLS is detected with https URL")
}

func TestPostEndpoints_TLSDetection_TLSScheme(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment with shared helpers
	env := setupTestEnvironment(t, ctrl)

	// Create a mock EndpointForwarder for TLS
	mockForwarder := mocks.NewMockEndpointForwarder(ctrl)
	expectedURL, _ := url.Parse("tls://test-123-8080.ngrok.io")

	// Setup forwarder expectations
	mockForwarder.EXPECT().URL().Return(expectedURL).AnyTimes()
	mockForwarder.EXPECT().ID().Return("endpoint-id-123").AnyTimes()

	// Setup agent expectations - agent should be created and connected
	env.expectNewAgent().Times(1)
	env.expectAgentConnect().Times(1)

	// Mock protocol detector to return TLS = true
	env.MockProtocolDetector.EXPECT().
		Detect(gomock.Any(), "172.17.0.1", "8080").
		Return(&detectproto.Result{
			TCP:   true,
			HTTP:  false,
			HTTPS: false,
			TLS:   true,
		}, nil).
		Times(1)

	// Track what upstream URL is actually passed to Forward()
	var capturedUpstreamURL string

	// Use a custom expectation to capture and verify the upstream URL
	env.MockAgent.EXPECT().
		Forward(
			gomock.Any(), // context
			gomock.Any(), // upstream (we'll capture this)
			gomock.Any(), // options
		).
		Do(func(ctx interface{}, upstream interface{}, opts ...interface{}) {
			// Extract the upstream URL by parsing the string representation
			upstreamStr := fmt.Sprintf("%+v", upstream)
			t.Logf("Forward called with upstream: %s", upstreamStr)

			if strings.Contains(upstreamStr, "addr:") {
				parts := strings.Split(upstreamStr, "addr:")
				if len(parts) > 1 {
					addrPart := strings.Fields(parts[1])[0]
					capturedUpstreamURL = addrPart
				}
			}
			t.Logf("Captured upstream URL: %s", capturedUpstreamURL)
		}).
		Return(mockForwarder, nil).
		Times(1)

	// Pre-create agent configuration
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	})

	// Mock Docker to return container as available
	env.expectDockerContainer("test-container-123", true)

	// Create endpoint request with TLS URL
	endpointRequest := handler.EndpointRequest{
		ContainerID:   "test-container-123",
		TargetPort:    "8080",
		URL:           "tls://custom-tls-endpoint.ngrok.io", // TLS scheme
		ExpectedState: "online",
	}

	// Execute request
	actualResponse := env.postEndpoint(endpointRequest)

	// Verify the endpoint was created
	assert.Equal(t, "test-container-123:8080", actualResponse.ID)
	assert.Equal(t, "test-container-123", actualResponse.ContainerID)
	assert.Equal(t, "8080", actualResponse.TargetPort)

	// ASSERTION: When TLS is detected and URL is tls, upstream should use tls scheme
	assert.Equal(t, "tls://172.17.0.1:8080", capturedUpstreamURL,
		"Expected upstream URL to use tls scheme when TLS is detected with tls URL")
}
