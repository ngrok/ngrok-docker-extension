package session

import (
	"context"
	"net/http"
	"sync"

	"github.com/ngrok/ngrok-docker-extension/internal/log"
	"golang.ngrok.com/ngrok"
	"golang.ngrok.com/ngrok/config"

	"github.com/labstack/echo/v4"
)

var NgrokRootSession *ngrok.Session
var NgrokAuthToken string
var tunnels []ngrok.Tunnel = nil
var Cache ProgressCache = ProgressCache{
	Tunnels: initCache(),
}

func StartNgrokSession() {
	if NgrokRootSession != nil {
		return
	}

	log.Info("Starting ngrok session")
	log.Info(NgrokAuthToken)

	localSession, err := ngrok.Connect(
		context.Background(),
		ngrok.WithAuthtoken(NgrokAuthToken),
		ngrok.WithConnectHandler(func(ctx context.Context, sess ngrok.Session) {
			log.Info("Connected to ngrok server")
		}),
		ngrok.WithDisconnectHandler(func(ctx context.Context, sess ngrok.Session, err error) {
			userError := err != nil && err.Error() != "internal server error"
			log.Info("Disconnected from ngrok server")

			switch {
			case err == nil:
				// startedOnce = true

			case err != nil && userError:
				// s.sendStop(err)
			}
			// sessUpdates <- err
		}),
		ngrok.WithConnectHandler(func(ctx context.Context, sess ngrok.Session) {
			log.Info("tunnel session started")
		}))

	if err != nil {
		log.Error("failed to connect to ngrok server: %v", err)
	} else {
		NgrokRootSession = &localSession
	}
}

func StartTunnel(ctx context.Context) (ngrok.Tunnel, error) {
	if NgrokRootSession == nil {
		StartNgrokSession()
	}

	tunConfig := config.HTTPEndpoint()

	tunnel, err := (*NgrokRootSession).Listen(ctx, tunConfig)

	if tunnel != nil {
		tunnels = append(tunnels, tunnel)
	}

	return tunnel, err
}

func SetAuthToken(token string) {
	if token == NgrokAuthToken {
		return
	}

	NgrokAuthToken = token
	if NgrokRootSession != nil {
		log.Info("Closing ngrok session, new AuthToken")

		Cache.Tunnels = initCache()

		for _, t := range tunnels {
			t.Close()
		}

		tunnels = nil

		(*NgrokRootSession).Close()
		NgrokRootSession = nil
	}

	StartNgrokSession()
}

type ProgressCache struct {
	sync.RWMutex
	Tunnels map[string]Tunnel // map of containers and active tunnels
}

type Tunnel struct {
	Tunnel   ngrok.Tunnel
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
