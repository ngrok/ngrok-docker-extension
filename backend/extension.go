package main

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"time"

	"github.com/docker/docker/client"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/ngrok/ngrok-docker-extension/internal/endpoint"
	"github.com/ngrok/ngrok-docker-extension/internal/handler"
)

// ngrokExtension encapsulates all the state and functionality of the ngrok Docker extension
type ngrokExtension struct {
	// Configuration
	socketPath string
	logger     *slog.Logger
	
	// HTTP server components
	router *echo.Echo
	handler *handler.Handler
	
	// Ngrok endpoint management
	endpointManager endpoint.Manager
	
	// Docker client factory
	cliFactory func() (*client.Client, error)
}

// newNgrokExtension creates and initializes a new ngrok extension instance
func newNgrokExtension(socketPath string, logger *slog.Logger) (*ngrokExtension, error) {
	ext := &ngrokExtension{
		socketPath:      socketPath,
		logger:          logger,
		endpointManager: endpoint.NewManager(logger),
		cliFactory: func() (*client.Client, error) {
			return client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
		},
	}
	
	// Initialize components
	if err := ext.initRouter(); err != nil {
		return nil, fmt.Errorf("failed to initialize router: %w", err)
	}
	
	if err := ext.initHandler(); err != nil {
		return nil, fmt.Errorf("failed to initialize handler: %w", err)
	}
	
	return ext, nil
}

// initRouter sets up the Echo router with middleware and error handling
func (ext *ngrokExtension) initRouter() error {
	ext.router = echo.New()
	ext.router.HTTPErrorHandler = func(err error, c echo.Context) {
		ext.logger.Error("HTTP error", "error", err)
		c.JSON(http.StatusInternalServerError, err.Error())
	}
	ext.router.HideBanner = true

	logMiddleware := middleware.LoggerWithConfig(middleware.LoggerConfig{
		Skipper: middleware.DefaultSkipper,
		Format: `{"time":"${time_rfc3339_nano}","id":"${id}",` +
			`"host":"${host}","method":"${method}","uri":"${uri}","user_agent":"${user_agent}",` +
			`"status":${status},"error":"${error}","latency":${latency},"latency_human":"${latency_human}"` +
			`,"bytes_in":${bytes_in},"bytes_out":${bytes_out}}` + "\n",
		CustomTimeFormat: "2006-01-02 15:04:05.00000",
		Output:           os.Stdout,
	})
	ext.router.Use(logMiddleware)
	
	return nil
}

// initHandler creates the HTTP handler
func (ext *ngrokExtension) initHandler() error {
	ext.handler = handler.New(ext.cliFactory, ext.logger, ext.endpointManager)
	
	// Setup routes
	ext.router.POST("/auth", ext.handler.SetupAuth)
	ext.router.GET("/progress", ext.handler.ActionsInProgress)
	ext.router.POST("/start", ext.handler.StartEndpoint)
	ext.router.POST("/remove", ext.handler.RemoveEndpoint)
	
	return nil
}



// Run starts the extension and runs until the context is cancelled
func (ext *ngrokExtension) Run(ctx context.Context) error {
	// Remove any existing socket file
	_ = os.RemoveAll(ext.socketPath)

	ext.logger.Info("Starting listening", "socketPath", ext.socketPath)
	ln, err := net.Listen("unix", ext.socketPath)
	if err != nil {
		return fmt.Errorf("failed to listen on socket: %w", err)
	}
	ext.router.Listener = ln

	// Start server in goroutine
	serverErrChan := make(chan error, 1)
	go func() {
		server := &http.Server{
			Addr: "",
		}

		if err := ext.router.StartServer(server); err != nil && err != http.ErrServerClosed {
			serverErrChan <- fmt.Errorf("failed to start server: %w", err)
		}
		close(serverErrChan)
	}()

	// Wait for context cancellation or server error
	select {
	case <-ctx.Done():
		ext.logger.Info("Shutting down due to context cancellation")
		return ext.shutdown()
	case err := <-serverErrChan:
		if err != nil {
			return err
		}
		return nil
	}
}

// shutdown gracefully shuts down the extension
func (ext *ngrokExtension) shutdown() error {
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	// Shutdown endpoint manager first
	if err := ext.endpointManager.Shutdown(shutdownCtx); err != nil {
		ext.logger.Warn("Error shutting down endpoint manager", "error", err)
	}
	
	if err := ext.router.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("failed to shutdown server gracefully: %w", err)
	}
	
	return nil
}
