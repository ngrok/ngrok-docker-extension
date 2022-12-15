package main

import (
	"context"
	"flag"
	"net"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/labstack/echo/v4/middleware"

	"github.com/docker/docker/client"
	"github.com/labstack/echo/v4"

	"github.com/felipecruz91/ngrok-go/internal/handler"
	"github.com/felipecruz91/ngrok-go/internal/log"
)

var (
	h *handler.Handler
)

func main() {
	var socketPath string
	flag.StringVar(&socketPath, "socket", "/run/guest/ext.sock", "Unix domain socket to listen on")
	flag.Parse()

	_ = os.RemoveAll(socketPath)

	// Output to stdout instead of the default stderr
	log.SetOutput(os.Stdout)

	router := echo.New()
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

	log.Infof("Starting listening on %s\n", socketPath)
	ln, err := net.Listen("unix", socketPath)
	if err != nil {
		log.Fatal(err)
	}
	router.Listener = ln

	cliFactory := func() (*client.Client, error) {
		return client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	}
	if err != nil {
		log.Fatal(err)
	}

	h = handler.New(context.Background(), cliFactory)

	router.GET("/auth", h.SetupAuth)
	router.GET("/progress", h.ActionsInProgress)
	router.POST("/start/:container", h.StartTunnel)
	router.DELETE("/remove/:container", h.RemoveTunnel)

	// Start server
	go func() {
		server := &http.Server{
			Addr: "",
		}

		if err := router.StartServer(server); err != nil && err != http.ErrServerClosed {
			log.Fatal("shutting down the server")
		}
	}()

	//TODO: go func listening for stopped, kill events -> remove them from the map
	//cli, err := cliFactory()
	//if err != nil {
	//	log.Fatal(err)
	//}
	//
	//go func() {
	//	eventsCh, errCh := cli.Events(context.Background(), types.EventsOptions{
	//		Filters: filters.NewArgs(
	//			filters.Arg("type", "container"),
	//			filters.Arg("label", "com.docker.desktop.extension.name=Ngrok Docker Extension"),
	//			filters.Arg("event", "die"),
	//			filters.Arg("event", "stop"),
	//			filters.Arg("event", "start"),
	//		),
	//	})
	//	for {
	//		select {
	//		case err := <-errCh:
	//			log.Error(err)
	//			//log.WithError(err).Error("Unable to connect to docker events channel, reconnecting...")
	//			//time.Sleep(5 * time.Second)
	//			//eventsCh, errCh = cli.Events(context.Background(), types.EventsOptions{})
	//		case event := <-eventsCh:
	//			log.Infof("Event received: %+v", event)
	//
	//			tunnelCtr, err := cli.ContainerInspect(context.Background(), event.ID)
	//			if err != nil {
	//				//TODO
	//				log.Error(err)
	//				//return nil
	//			}
	//			appCtr := tunnelCtr.Config.Labels["app.container"]
	//			log.Infof("appCtr: %s", appCtr)
	//
	//			switch event.Action {
	//			case "stop", "pause", "die":
	//				log.Infof("Deleting %s from map", appCtr)
	//				h.Delete(appCtr)
	//
	//			case "start", "unpause":
	//
	//				//TODO: we have to wait until container is fully started to read the logs
	//				time.Sleep(3 * time.Second)
	//
	//				out, err := cli.ContainerLogs(context.Background(), event.ID, types.ContainerLogsOptions{ShowStdout: true, ShowStderr: true})
	//				if err != nil {
	//					//TODO: log error
	//					continue
	//				}
	//
	//				var buf bytes.Buffer
	//				_, err = stdcopy.StdCopy(&buf, os.Stderr, out)
	//				if err != nil {
	//					//TODO: log error
	//					continue
	//				}
	//
	//				var st handler.StartTunnelLine
	//				for _, line := range strings.Split(buf.String(), "\n") {
	//					log.Infof(line)
	//					if strings.Contains(line, "started tunnel") {
	//						if err := json.Unmarshal([]byte(line), &st); err != nil {
	//							//TODO: log error
	//							continue
	//						}
	//					}
	//				}
	//
	//				// add it to the  map
	//				log.Infof("Adding %s to map", appCtr)
	//				h.Add(appCtr, event.ID, st.URL)
	//			}
	//		}
	//	}
	//}()

	// Wait for interrupt signal to gracefully shut down the server with a timeout of 10 seconds.
	// Use a buffered channel to avoid missing signals as recommended for signal.Notify
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := router.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}
}
