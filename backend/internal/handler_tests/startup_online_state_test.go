package handler_tests

import (
	"context"
	"testing"

	"github.com/ngrok/ngrok-docker-extension/internal/manager"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/store"
)

func TestExtensionStartup_OnlineAgentAndEndpoint_ConvergesCorrectly(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Create initial state simulating a previously running extension with online agent and endpoint
	initialState := &store.State{
		AgentConfig: store.AgentConfig{
			AuthToken:     "ngrok_startup_token",
			ExpectedState: "online",
		},
		EndpointConfigs: map[string]store.EndpointConfig{
			"startup-container:3000": {
				ID:            "startup-container:3000",
				ContainerID:   "startup-container",
				TargetPort:    "3000",
				URL:           "startup-app",
				ExpectedState: "online",
			},
		},
		Version: 1,
	}

	// Create test environment and set initial state
	env := setupTestEnvironment(t, ctrl)
	err := env.Store.Save(initialState)
	assert.NoError(t, err, "Setting initial state should succeed")

	// Mock Docker to return container as available
	env.expectDockerContainer("startup-container", true)

	// Setup protocol detector expectations
	env.expectHTTPProtocolDetection()

	// Setup agent expectations
	env.expectNewAgent().Times(1)
	env.expectAgentConnect().Times(1)

	// Create a mock forwarder for the endpoint that should come online during startup
	mockForwarder := env.createMockForwarder(ctrl, "https://startup-app.ngrok.io", "startup-endpoint")
	env.expectAgentForward().Return(mockForwarder, nil).Times(1)

	// Simulate extension startup by running convergence
	err = env.Manager.Converge(context.Background())
	assert.NoError(t, err, "Convergence should succeed during startup")

	// Verify agent came online via API
	agentResponse := env.getAgent()
	assert.Equal(t, "online", agentResponse.ExpectedState, "Agent expectedState should be online after startup")
	assert.Equal(t, manager.AgentStateOnline, agentResponse.Status.State, "Agent should be online after startup")

	// Verify endpoint came online via API
	endpointsResponse := env.getEndpoints()
	assert.Len(t, endpointsResponse.Endpoints, 1, "Should have one endpoint")

	endpoint := endpointsResponse.Endpoints[0]
	assert.Equal(t, "startup-container:3000", endpoint.ID, "Endpoint ID should match")
	assert.Equal(t, "online", endpoint.ExpectedState, "Endpoint expectedState should be online")
	assert.Equal(t, manager.EndpointStateOnline, endpoint.Status.State, "Endpoint should be online after startup")
	assert.Equal(t, "https://startup-app.ngrok.io", endpoint.Status.URL, "Endpoint should have ngrok URL")
}

func TestPutAgent_OnlineState_MakesEndpointsOnline(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Setup test environment
	env := setupTestEnvironment(t, ctrl)
	env.setupStandardMockExpectations()

	// Step 1: Start with agent configured as online
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	})

	// Mock Docker containers as available
	env.expectDockerContainer("container1", true)
	env.expectDockerContainer("container2", true)

	// Create mock forwarders for initial endpoint creation
	mockForwarder1 := env.createMockForwarder(ctrl, "https://app1.ngrok.io", "endpoint-id-1")
	env.expectAgentForward().Return(mockForwarder1, nil).Times(1)

	// Step 2: Create endpoints while agent is online
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
		ExpectedState: "offline",
	}
	endpoint2Response := env.postEndpoint(endpoint2Request)

	// Verify initial states
	assert.Equal(t, manager.EndpointStateOnline, endpoint1Response.Status.State)
	assert.Equal(t, manager.EndpointStateOffline, endpoint2Response.Status.State)
	assert.Equal(t, "online", endpoint1Response.ExpectedState)
	assert.Equal(t, "offline", endpoint2Response.ExpectedState)

	// Step 3: Set agent offline (should close forwarders)
	mockForwarder1.EXPECT().Close().Return(nil).Times(1)

	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "offline",
	})

	// Step 4: Set agent expected state to online; no endpoints should come online
	env.putAgent(store.AgentConfig{
		AuthToken:     "ngrok_test_token",
		ExpectedState: "online",
	})

	// Step 5: Verify agent is online
	agentResponse := env.getAgent()
	assert.Equal(t, "online", agentResponse.ExpectedState)
	assert.Equal(t, manager.AgentStateOnline, agentResponse.Status.State)

	// Step 6: Verify endpoints behavior
	getResponse := env.getEndpoints()
	assert.Len(t, getResponse.Endpoints, 2, "Both endpoints should still be in storage")

	// Find endpoints by container ID to verify specific behavior
	var endpoint1, endpoint2 *handler.EndpointResponse
	for i := range getResponse.Endpoints {
		if getResponse.Endpoints[i].ContainerID == "container1" {
			endpoint1 = &getResponse.Endpoints[i]
		} else if getResponse.Endpoints[i].ContainerID == "container2" {
			endpoint2 = &getResponse.Endpoints[i]
		}
	}

	// Verify both endpoints expected state is offline. When you explicitly set
	// the agent status to offline, as we did earlier, it must set the expected
	// state of all endpoints to offline

	assert.NotNil(t, endpoint1, "Endpoint1 should exist")
	assert.Equal(t, manager.EndpointStateOffline, endpoint1.Status.State, "Endpoint1 should be online when agent comes online")
	assert.Equal(t, manager.EndpointStateOffline, endpoint1.ExpectedState, "Endpoint1 expectedState should remain 'offline'")
	assert.NotNil(t, endpoint2, "Endpoint2 should exist")
	assert.Equal(t, manager.EndpointStateOffline, endpoint2.Status.State, "Endpoint2 should remain offline when expectedState is offline")
	assert.Equal(t, manager.EndpointStateOffline, endpoint2.ExpectedState, "Endpoint2 expectedState should remain 'offline'")
	assert.Empty(t, endpoint2.Status.URL, "Endpoint2 should not have ngrok URL when offline")
}
