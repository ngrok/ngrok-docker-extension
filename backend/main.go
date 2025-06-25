package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"os/signal"
)

func main() {
	var socketPath string
	flag.StringVar(&socketPath, "socket", "/run/guest/ext.sock", "Unix domain socket to listen on")
	flag.Parse()

	// Setup structured logger to output to stdout
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	// Create the ngrok extension
	ext, err := newNgrokExtension(socketPath, logger)
	if err != nil {
		logger.Error("Failed to initialize ngrok extension", "error", err)
		os.Exit(1)
	}

	// Setup signal handling
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)

	// Start the extension in a goroutine
	extensionErrChan := make(chan error, 1)
	go func() {
		extensionErrChan <- ext.Run(ctx)
	}()

	// Wait for signal or extension error
	select {
	case <-quit:
		logger.Info("Received interrupt signal, shutting down")
		cancel()
		// Wait for graceful shutdown
		if err := <-extensionErrChan; err != nil {
			logger.Error("Extension shutdown error", "error", err)
			os.Exit(1)
		}
	case err := <-extensionErrChan:
		if err != nil {
			logger.Error("Extension error", "error", err)
			os.Exit(1)
		}
	}
}
