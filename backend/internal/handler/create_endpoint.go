package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"golang.ngrok.com/ngrok/v2"
)

func (h *Handler) CreateEndpoint(ctx echo.Context) error {
	var req CreateEndpointRequest
	if err := ctx.Bind(&req); err != nil {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid request format"})
	}
	
	if req.ContainerID == "" {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "containerId is required"})
	}
	if req.TargetPort == "" {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "targetPort is required"})
	}
	
	h.logger.Info("Creating endpoint for container", "containerID", req.ContainerID)
	h.logger.Info("Using targetPort", "targetPort", req.TargetPort)

	// Build endpoint options from request
	var opts []ngrok.EndpointOption
	if req.Binding != nil {
		opts = append(opts, ngrok.WithBindings(*req.Binding))
	}
	if req.URL != nil {
		opts = append(opts, ngrok.WithURL(*req.URL))
	}
	if req.PoolingEnabled != nil {
		opts = append(opts, ngrok.WithPoolingEnabled(*req.PoolingEnabled))
	}
	if req.TrafficPolicy != nil {
		opts = append(opts, ngrok.WithTrafficPolicy(*req.TrafficPolicy))
	}
	if req.Description != nil {
		opts = append(opts, ngrok.WithDescription(*req.Description))
	}
	if req.Metadata != nil {
		opts = append(opts, ngrok.WithMetadata(*req.Metadata))
	}

	endpoint, err := h.endpointManager.CreateEndpoint(ctx.Request().Context(), req.ContainerID, req.TargetPort, opts...)
	if err != nil {
		h.logger.Error("Failed to create endpoint", "error", err)
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	response := Endpoint{
		ID:          endpoint.Forwarder.ID(),
		URL:         endpoint.Forwarder.URL().String(),
		ContainerID: endpoint.ContainerID,
		TargetPort:  endpoint.TargetPort,
	}

	return ctx.JSON(http.StatusCreated, CreateEndpointResponse{Endpoint: response})
}
