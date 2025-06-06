package session

import (
	"context"
	"net/http"
	"sync"

	"github.com/ngrok/ngrok-docker-extension/internal/log"
	"golang.ngrok.com/ngrok/v2"

	"github.com/labstack/echo/v4"
)

var NgrokAgent ngrok.Agent
var NgrokAuthToken string
var tunnels []ngrok.EndpointForwarder = nil
var Cache ProgressCache = ProgressCache{
	Tunnels: initCache(),
}

func StartNgrokSession() {
	if NgrokAgent != nil {
		return
	}

	log.Info("Starting ngrok agent")

	agent, err := ngrok.NewAgent(
		ngrok.WithAuthtoken(NgrokAuthToken),
		ngrok.WithEventHandler(func(event ngrok.Event) {
			switch e := event.(type) {
			case *ngrok.EventAgentConnectSucceeded:
				log.Info("Connected to ngrok server")
			case *ngrok.EventAgentDisconnected:
				log.Info("Disconnected from ngrok server")
				if e.Error != nil {
					log.Error("Disconnect error:", e.Error)
				}
			}
		}),
	)
	if err != nil {
		log.Error("failed to create ngrok agent:", err)
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
		log.Info("Closing ngrok agent, new AuthToken")
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

	log.Info(m)

	return m
}
