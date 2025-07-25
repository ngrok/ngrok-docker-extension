package handler_tests

import (
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/manager"
	"github.com/ngrok/ngrok-docker-extension/internal/manager/mocks"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPostEndpoints_MultipleEndpointsForSameContainer(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment with shared helpers
	env := setupTestEnvironment(t, ctrl)
	env.setupStandardMockExpectations()

	// Create mock EndpointForwarders for the Forward() calls
	mockForwarder1 := mocks.NewMockEndpointForwarder(ctrl)
	url1, _ := url.Parse("https://container123-8080.ngrok.io")
	mockForwarder1.EXPECT().URL().Return(url1).AnyTimes()
	mockForwarder1.EXPECT().ID().Return("endpoint-id-1").AnyTimes()

	mockForwarder2 := mocks.NewMockEndpointForwarder(ctrl)
	url2, _ := url.Parse("https://container123-3000.ngrok.io")
	mockForwarder2.EXPECT().URL().Return(url2).AnyTimes()
	mockForwarder2.EXPECT().ID().Return("endpoint-id-2").AnyTimes()

	// Expect Agent.Forward() to be called twice and return our mock forwarders
	env.expectAgentForward().
		Return(mockForwarder1, nil).
		Times(1)
	env.expectAgentForward().
		Return(mockForwarder2, nil).
		Times(1)

	// Pre-create agent configuration using shared helper
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token_preset",
		ExpectedState: "online",
	})

	// Set up Docker container mock
	env.expectDockerContainer("container123", true)

	// Step 2: POST /endpoints for container123:8080
	endpoint1Req := handler.EndpointRequest{
		ContainerID:   "container123",
		TargetPort:    "8080",
		ExpectedState: "online",
	}

	// Execute first endpoint request using helper
	endpoint1Response := *env.postEndpoint(endpoint1Req)

	// Verify first endpoint structure
	assert.Equal(t, "container123:8080", endpoint1Response.ID)
	assert.Equal(t, "container123", endpoint1Response.ContainerID)
	assert.Equal(t, "8080", endpoint1Response.TargetPort)
	assert.Equal(t, "online", endpoint1Response.ExpectedState)
	assert.Equal(t, manager.EndpointStateOnline, endpoint1Response.Status.State)
	assert.Equal(t, "https://container123-8080.ngrok.io", endpoint1Response.Status.URL)
	assert.NotEmpty(t, endpoint1Response.LastStarted)

	// Step 3: POST /endpoints for container123:3000 (same container, different port)
	endpoint2Req := handler.EndpointRequest{
		ContainerID:   "container123",
		TargetPort:    "3000",
		ExpectedState: "online",
	}

	// Execute second endpoint request using helper
	endpoint2Response := env.postEndpoint(endpoint2Req)

	// Verify second endpoint structure
	assert.Equal(t, "container123:3000", endpoint2Response.ID)
	assert.Equal(t, "container123", endpoint2Response.ContainerID)
	assert.Equal(t, "3000", endpoint2Response.TargetPort)
	assert.Equal(t, "online", endpoint2Response.ExpectedState)
	assert.Equal(t, manager.EndpointStateOnline, endpoint2Response.Status.State)
	assert.Equal(t, "https://container123-3000.ngrok.io", endpoint2Response.Status.URL)
	assert.NotEmpty(t, endpoint2Response.LastStarted)

	// Verify endpoints have unique IDs
	assert.NotEqual(t, endpoint1Response.ID, endpoint2Response.ID,
		"Endpoints should have unique IDs")
}
