package session

import (
	"context"
	"log/slog"
	"net/http"
	"sync"

	"golang.ngrok.com/ngrok/v2"

	"github.com/labstack/echo/v4"
)

var NgrokAgent ngrok.Agent
var NgrokAuthToken string
var tunnels []ngrok.EndpointForwarder = nil
var Cache ProgressCache = ProgressCache{
	Tunnels: initCache(),
}
var logger *slog.Logger

func SetLogger(l *slog.Logger) {
	logger = l
}

func StartNgrokSession() {
	if NgrokAgent != nil {
		return
	}

	logger.Info("Starting ngrok agent")

	agent, err := ngrok.NewAgent(
		ngrok.WithAuthtoken(NgrokAuthToken),
		ngrok.WithLogger(logger),
		ngrok.WithEventHandler(func(event ngrok.Event) {
			switch e := event.(type) {
			case *ngrok.EventAgentConnectSucceeded:
				logger.Info("Connected to ngrok server")
			case *ngrok.EventAgentDisconnected:
				logger.Info("Disconnected from ngrok server")
				if e.Error != nil {
					logger.Error("Disconnect error", "error", e.Error)
				}
			}
		}),
	)
	if err != nil {
		logger.Error("Failed to create ngrok agent", "error", err)
		return
	}

	NgrokAgent = agent
}

func StartTunnel(ctx context.Context, port string) (ngrok.EndpointForwarder, error) {
	if NgrokAgent == nil {
		StartNgrokSession()
	}

	// Create upstream pointing to the Docker container
	upstream := ngrok.WithUpstream("http://172.17.0.1:"+port)
	
	endpoint, err := NgrokAgent.Forward(ctx, upstream,
		// HTTP endpoint with default options
		// Add metadata if needed: ngrok.WithMetadata("container-tunnel")
	)
	
	return endpoint, err
}

func SetAuthToken(token string) {
	if token == NgrokAuthToken {
		return
	}

	NgrokAuthToken = token
	
	if NgrokAgent != nil {
		logger.Info("Closing ngrok agent, new AuthToken")
		Cache.Tunnels = initCache()

		for _, endpoint := range tunnels {
			endpoint.Close()
		}
		tunnels = nil

		NgrokAgent.Disconnect()
		NgrokAgent = nil
	}

	StartNgrokSession()
}

type ProgressCache struct {
	sync.RWMutex
	Tunnels map[string]Tunnel // map of containers and active tunnels
}

type Tunnel struct {
	Endpoint ngrok.EndpointForwarder
	TunnelID string
	URL      string
}

// ActionsInProgress retrieves the list of active tunnels.
func ActionsInProgress(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, Cache.Tunnels)
}

func Add(key string, TunnelID, url string) {
	Cache.Lock()
	defer Cache.Unlock()

	Cache.Tunnels[key] = Tunnel{
		TunnelID: TunnelID,
		URL:      url,
	}
}

func Delete(key string) {

	Cache.Lock()
	defer Cache.Unlock()

	delete(Cache.Tunnels, key)
}

func initCache() map[string]Tunnel {
	m := make(map[string]Tunnel)

	if logger != nil {
		logger.Debug("Initialized cache", "cache", m)
	}

	return m
}
