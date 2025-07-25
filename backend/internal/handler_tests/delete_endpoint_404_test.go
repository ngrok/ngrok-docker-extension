package handler_tests

import (
	"net/http"
	"testing"

	"go.uber.org/mock/gomock"
)

func TestDeleteEndpoint_NotFound(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	env := setupTestEnvironment(t, ctrl)

	// Make request to delete a non-existent endpoint
	errorResponse := env.deleteEndpointExpectingError("nonexistent:8080", http.StatusNotFound)

	// Verify error message
	if errorResponse["error"] != "Endpoint not found" {
		t.Errorf("Expected 'Endpoint not found' error message, got %q", errorResponse["error"])
	}
}
