package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func (h *Handler) DetectProtocol(c echo.Context) error {
	var req DetectProtocolRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid request body"})
	}

	if req.ContainerID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "containerID required"})
	}

	if req.Port == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "port required"})
	}

	result, err := h.endpointManager.DetectContainerProtocol(req.ContainerID, req.Port)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	response := DetectProtocolResponse{
		TCP:   result.TCP,
		HTTP:  result.HTTP,
		HTTPS: result.HTTPS,
		TLS:   result.TLS,
	}

	return c.JSON(http.StatusOK, response)
}
