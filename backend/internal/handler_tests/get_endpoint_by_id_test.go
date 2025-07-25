package handler_tests

import (
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/manager/mocks"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestGetEndpointByID_ReturnsSameRepresentationAsCreated(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)
	env.setupStandardMockExpectations()

	// Create a mock EndpointForwarder
	mockForwarder := mocks.NewMockEndpointForwarder(ctrl)
	expectedURL, _ := url.Parse("https://myapp.ngrok.io")
	mockForwarder.EXPECT().URL().Return(expectedURL).AnyTimes()
	mockForwarder.EXPECT().ID().Return("endpoint-id-123").AnyTimes()

	// Expect Agent.Forward() to be called
	env.expectAgentForward().
		Return(mockForwarder, nil).
		Times(1)

	// Pre-create agent configuration
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	})

	// Mock Docker container as available
	env.expectDockerContainer("test-container", true)

	// Create an endpoint using POST
	endpointRequest := handler.EndpointRequest{
		ContainerID:   "test-container",
		TargetPort:    "8080",
		URL:           "myapp",
		Description:   "My test app",
		Metadata:      "test=true",
		ExpectedState: "online",
	}
	createResponse := env.postEndpoint(endpointRequest)

	// Now retrieve the same endpoint using GET /endpoints/:id
	getResponse := env.getEndpointByID("test-container:8080")

	// Verify that GET /endpoints/:id returns the same representation as POST
	assert.Equal(t, createResponse.ID, getResponse.ID)
	assert.Equal(t, createResponse.ContainerID, getResponse.ContainerID)
	assert.Equal(t, createResponse.TargetPort, getResponse.TargetPort)
	assert.Equal(t, createResponse.URL, getResponse.URL)
	assert.Equal(t, createResponse.Description, getResponse.Description)
	assert.Equal(t, createResponse.Metadata, getResponse.Metadata)
	assert.Equal(t, createResponse.ExpectedState, getResponse.ExpectedState)
	assert.Equal(t, createResponse.Status.State, getResponse.Status.State)
	assert.Equal(t, createResponse.Status.URL, getResponse.Status.URL)
	assert.Equal(t, createResponse.Status.LastError, getResponse.Status.LastError)
	assert.Equal(t, createResponse.LastStarted, getResponse.LastStarted)
}

func TestGetEndpointByID_EndpointNotFound(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)

	// Try to get a non-existent endpoint
	errorResponse := env.getEndpointByIDExpectingError("nonexistent:8080", 404)

	// Verify error response
	assert.Equal(t, "Endpoint not found", errorResponse["error"])
}
