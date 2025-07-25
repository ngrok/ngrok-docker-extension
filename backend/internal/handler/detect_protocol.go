package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/ngrok/ngrok-docker-extension/internal/detectproto"
)

// Detect Protocol Types
type DetectProtocolRequest struct {
	ContainerID string `json:"container_id"`
	Port        string `json:"port"`
}

type DetectProtocolResponse struct {
	TCP   bool `json:"tcp"`
	HTTP  bool `json:"http"`
	HTTPS bool `json:"https"`
	TLS   bool `json:"tls"`
}

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

	// Detect protocols on the port with 250ms timeout
	detectCtx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond)
	defer cancel()

	// 172.17.0.1 is docker's bridge IP where containers listen
	d := detectproto.NewDetector()
	result, err := d.Detect(detectCtx, "172.17.0.1", req.Port)
	if err != nil {
		return h.internalServerError(c, err.Error())
	}

	response := DetectProtocolResponse{
		TCP:   result.TCP,
		HTTP:  result.HTTP,
		HTTPS: result.HTTPS,
		TLS:   result.TLS,
	}

	return c.JSON(http.StatusOK, response)
}
