package handler_tests

import (
	"testing"

	"github.com/ngrok/ngrok-docker-extension/internal/manager"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestPutAgent_OfflineState_MakesAllEndpointsOffline(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)
	env.setupStandardMockExpectations()

	// Create mock EndpointForwarders for the initial endpoint creation
	mockForwarder1 := env.createMockForwarder(ctrl, "https://app1.ngrok.io", "endpoint-id-1")
	mockForwarder2 := env.createMockForwarder(ctrl, "https://app2.ngrok.io", "endpoint-id-2")
	mockForwarder3 := env.createMockForwarder(ctrl, "https://app3.ngrok.io", "endpoint-id-3")

	// Expect Agent.Forward() to be called for each endpoint creation
	env.expectAgentForward().Return(mockForwarder1, nil).Times(1)
	env.expectAgentForward().Return(mockForwarder2, nil).Times(1)
	env.expectAgentForward().Return(mockForwarder3, nil).Times(1)

	// Expect forwarder closures when agent goes offline
	mockForwarder1.EXPECT().Close().Return(nil).Times(1)
	mockForwarder2.EXPECT().Close().Return(nil).Times(1)
	mockForwarder3.EXPECT().Close().Return(nil).Times(1)

	// Step 1: Configure agent to be online
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	})

	// Mock Docker containers as available
	env.expectDockerContainer("container1", true)
	env.expectDockerContainer("container2", true)
	env.expectDockerContainer("container3", true)

	// Step 2: Create multiple endpoints that are expected to be online
	endpoint1Request := handler.EndpointRequest{
		ContainerID:   "container1",
		TargetPort:    "8080",
		URL:           "app1",
		Description:   "First app",
		ExpectedState: "online",
	}
	endpoint1Response := env.postEndpoint(endpoint1Request)

	endpoint2Request := handler.EndpointRequest{
		ContainerID:   "container2",
		TargetPort:    "3000",
		URL:           "app2",
		Description:   "Second app",
		ExpectedState: "online",
	}
	endpoint2Response := env.postEndpoint(endpoint2Request)

	endpoint3Request := handler.EndpointRequest{
		ContainerID:   "container3",
		TargetPort:    "5000",
		URL:           "app3",
		Description:   "Third app",
		ExpectedState: "online",
	}
	endpoint3Response := env.postEndpoint(endpoint3Request)

	// Verify all endpoints are initially online
	assert.Equal(t, manager.EndpointStateOnline, endpoint1Response.Status.State)
	assert.Equal(t, manager.EndpointStateOnline, endpoint2Response.Status.State)
	assert.Equal(t, manager.EndpointStateOnline, endpoint3Response.Status.State)

	// Step 3: Debug - Check what's in storage before agent goes offline
	state, err := env.Store.Load()
	if assert.NoError(t, err) {
		t.Logf("Before agent offline - endpoints in store: %d", len(state.EndpointConfigs))
		for id, config := range state.EndpointConfigs {
			t.Logf("  Endpoint %s: expectedState=%s", id, config.ExpectedState)
		}
	}

	// Step 4: Set agent expected state to offline (this should NOT remove endpoint configs)
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "offline", // Endpoints should stay in storage but show offline status
	})

	// Step 5: Debug - Check what's in storage after agent goes offline
	state, err = env.Store.Load()
	if assert.NoError(t, err) {
		t.Logf("After agent offline - endpoints in store: %d", len(state.EndpointConfigs))
		for id, config := range state.EndpointConfigs {
			t.Logf("  Endpoint %s: expectedState=%s", id, config.ExpectedState)
		}
	}

	// Step 6: Verify endpoints are still in storage but show offline status
	getResponse := env.getEndpoints()
	assert.Len(t, getResponse.Endpoints, 3, "Endpoints should remain in storage when agent goes offline")

	// Check that all endpoints are now offline
	for _, endpoint := range getResponse.Endpoints {
		assert.Equal(t, manager.EndpointStateOffline, endpoint.Status.State,
			"Endpoint %s should be offline when agent is offline", endpoint.ID)
		// ExpectedState should be offline
		assert.Equal(t, manager.EndpointStateOffline, endpoint.ExpectedState,
			"Endpoint %s expectedState should remain 'online'", endpoint.ID)
	}
}
