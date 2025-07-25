package handler_tests

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestGetEndpoints_ReturnsIdenticalRepresentations(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)
	env.setupStandardMockExpectations()

	// Create mock EndpointForwarders for the Forward() calls
	mockForwarder1 := env.createMockForwarder(ctrl, "https://app1.ngrok.io", "endpoint-id-1")
	mockForwarder2 := env.createMockForwarder(ctrl, "https://app2.ngrok.io", "endpoint-id-2")

	// Expect Agent.Forward() to be called twice
	env.expectAgentForward().
		Return(mockForwarder1, nil).
		Times(1)
	env.expectAgentForward().
		Return(mockForwarder2, nil).
		Times(1)

	// Pre-create agent configuration
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	})

	// Mock Docker containers as available
	env.expectDockerContainer("container1", true)
	env.expectDockerContainer("container2", true)

	// Create first endpoint
	endpoint1Request := handler.EndpointRequest{
		ContainerID:   "container1",
		TargetPort:    "8080",
		URL:           "app1",
		Description:   "First app",
		ExpectedState: "online",
	}
	endpoint1Response := env.postEndpoint(endpoint1Request)

	// Create second endpoint
	endpoint2Request := handler.EndpointRequest{
		ContainerID:   "container2",
		TargetPort:    "3000",
		URL:           "app2",
		Description:   "Second app",
		ExpectedState: "online",
	}
	endpoint2Response := env.postEndpoint(endpoint2Request)

	// Now call GET /endpoints
	getResponse := env.getEndpoints()

	// Verify that GET /endpoints returns the same representations as what was created
	assert.Len(t, getResponse.Endpoints, 2)

	// Find endpoint1 in the response
	var foundEndpoint1, foundEndpoint2 *handler.EndpointResponse
	for _, ep := range getResponse.Endpoints {
		if ep.ID == "container1:8080" {
			foundEndpoint1 = &ep
		} else if ep.ID == "container2:3000" {
			foundEndpoint2 = &ep
		}
	}

	// Verify endpoint1 matches what was returned in POST
	if assert.NotNil(t, foundEndpoint1) {
		assert.Equal(t, endpoint1Response.ID, foundEndpoint1.ID)
		assert.Equal(t, endpoint1Response.ContainerID, foundEndpoint1.ContainerID)
		assert.Equal(t, endpoint1Response.TargetPort, foundEndpoint1.TargetPort)
		assert.Equal(t, endpoint1Response.URL, foundEndpoint1.URL)
		assert.Equal(t, endpoint1Response.Description, foundEndpoint1.Description)
		assert.Equal(t, endpoint1Response.ExpectedState, foundEndpoint1.ExpectedState)
		assert.Equal(t, endpoint1Response.Status.State, foundEndpoint1.Status.State)
		assert.Equal(t, endpoint1Response.Status.URL, foundEndpoint1.Status.URL)
		assert.Equal(t, endpoint1Response.Status.LastError, foundEndpoint1.Status.LastError)
	}

	// Verify endpoint2 matches what was returned in POST
	if assert.NotNil(t, foundEndpoint2) {
		assert.Equal(t, endpoint2Response.ID, foundEndpoint2.ID)
		assert.Equal(t, endpoint2Response.ContainerID, foundEndpoint2.ContainerID)
		assert.Equal(t, endpoint2Response.TargetPort, foundEndpoint2.TargetPort)
		assert.Equal(t, endpoint2Response.URL, foundEndpoint2.URL)
		assert.Equal(t, endpoint2Response.Description, foundEndpoint2.Description)
		assert.Equal(t, endpoint2Response.ExpectedState, foundEndpoint2.ExpectedState)
		assert.Equal(t, endpoint2Response.Status.State, foundEndpoint2.Status.State)
		assert.Equal(t, endpoint2Response.Status.URL, foundEndpoint2.Status.URL)
		assert.Equal(t, endpoint2Response.Status.LastError, foundEndpoint2.Status.LastError)
	}
}
