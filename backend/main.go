package main

import (
	"context"
	"flag"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/labstack/echo/v4/middleware"

	"github.com/docker/docker/client"
	"github.com/labstack/echo/v4"

	"github.com/ngrok/ngrok-docker-extension/internal/handler"
	"github.com/ngrok/ngrok-docker-extension/internal/session"
)

var (
	h *handler.Handler
	// NgrokRootSession *ngrok.Session
)

func main() {
	var socketPath string
	flag.StringVar(&socketPath, "socket", "/run/guest/ext.sock", "Unix domain socket to listen on")
	flag.Parse()

	_ = os.RemoveAll(socketPath)

	// Setup structured logger to output to stdout
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	// Set logger for session package
	session.SetLogger(logger)

	router := echo.New()
	router.HTTPErrorHandler = func(err error, c echo.Context) {
		logger.Error("HTTP error", "error", err)
		c.JSON(http.StatusInternalServerError, err.Error())
	}
	router.HideBanner = true

	logMiddleware := middleware.LoggerWithConfig(middleware.LoggerConfig{
		Skipper: middleware.DefaultSkipper,
		Format: `{"time":"${time_rfc3339_nano}","id":"${id}",` +
			`"host":"${host}","method":"${method}","uri":"${uri}","user_agent":"${user_agent}",` +
			`"status":${status},"error":"${error}","latency":${latency},"latency_human":"${latency_human}"` +
			`,"bytes_in":${bytes_in},"bytes_out":${bytes_out}}` + "\n",
		CustomTimeFormat: "2006-01-02 15:04:05.00000",
		Output:           os.Stdout,
	})
	router.Use(logMiddleware)

	logger.Info("Starting listening", "socketPath", socketPath)
	ln, err := net.Listen("unix", socketPath)
	if err != nil {
		logger.Error("Failed to listen on socket", "error", err)
		os.Exit(1)
	}
	router.Listener = ln

	cliFactory := func() (*client.Client, error) {
		return client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	}
	h = handler.New(context.Background(), cliFactory, logger)

	router.GET("/auth", h.SetupAuth)
	router.GET("/progress", session.ActionsInProgress)
	router.POST("/start/:container", h.StartTunnel)
	router.DELETE("/remove/:container", h.RemoveTunnel)

	// Start server
	go func() {
		server := &http.Server{
			Addr: "",
		}

		if err := router.StartServer(server); err != nil && err != http.ErrServerClosed {
			logger.Error("Failed to start server", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server with a timeout of 10 seconds.
	// Use a buffered channel to avoid missing signals as recommended for signal.Notify
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := router.Shutdown(ctx); err != nil {
		logger.Error("Failed to shutdown server gracefully", "error", err)
		os.Exit(1)
	}
}
