package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"os"
	"runtime"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	"golang.ngrok.com/ngrok"
	"golang.org/x/sync/errgroup"

	"github.com/ngrok/ngrok-docker-extension/internal"
	"github.com/ngrok/ngrok-docker-extension/internal/log"
)

type Handler struct {
	DockerClient   func() (*client.Client, error)
	ProgressCache  *ProgressCache
	ngrokAuthToken string
	ngrokSession   ngrok.Session
}

func New(ctx context.Context, cliFactory func() (*client.Client, error)) *Handler {
	cli, err := cliFactory()
	if err != nil {
		log.Fatal(err)
	}

	pullImagesIfNotPresent(ctx, cli)

	createVolumeIfNotExists(ctx, cli)

	return &Handler{
		DockerClient: cliFactory,
		ProgressCache: &ProgressCache{
			m: initCache(ctx, cli),
		},
		ngrokAuthToken: os.Getenv("NGROK_AUTHTOKEN"),
	}
}

func pullImagesIfNotPresent(ctx context.Context, cli *client.Client) {
	g, ctx := errgroup.WithContext(ctx)

	images := []string{
		internal.AlpineImage,
	}

	for _, image := range images {
		image := image // https://golang.org/doc/faq#closures_and_goroutines
		g.Go(func() error {
			_, _, err := cli.ImageInspectWithRaw(ctx, image)
			if err != nil {
				log.Info("Pulling Image:", image)
				reader, err := cli.ImagePull(ctx, image, types.ImagePullOptions{
					Platform: "linux/" + runtime.GOARCH,
				})
				if err != nil {
					return err
				}
				_, err = io.Copy(os.Stdout, reader)
			}

			return nil
		})
	}

	// wait for all the pull operations to complete
	if err := g.Wait(); err == nil {
		log.Info("Successfully pulled all the images")
	}
}

func initCache(ctx context.Context, cli *client.Client) map[string]Tunnel {
	list, err := cli.ContainerList(ctx, types.ContainerListOptions{
		Filters: filters.NewArgs(
			filters.Arg("label", "com.docker.desktop.extension=true"),
			filters.Arg("label", "com.docker.desktop.extension.name=ngrok Docker Extension"),
		),
	})
	if err != nil {
		return nil
	}

	m := make(map[string]Tunnel)
	for _, ctr := range list {
		cID := ctr.Labels["app.container"]

		out, err := cli.ContainerLogs(ctx, ctr.ID, types.ContainerLogsOptions{ShowStdout: true, ShowStderr: true})
		if err != nil {
			//TODO: log error
			continue
		}

		var buf bytes.Buffer
		_, err = stdcopy.StdCopy(&buf, os.Stderr, out)
		if err != nil {
			//TODO: log error
			continue
		}

		var st StartTunnelLine
		for _, line := range strings.Split(buf.String(), "\n") {
			log.Infof(line)
			if strings.Contains(line, "started tunnel") {
				if err := json.Unmarshal([]byte(line), &st); err != nil {
					//TODO: log error
					continue
				}
			}
		}

		m[cID] = Tunnel{TunnelID: ctr.ID, URL: st.URL}
	}

	log.Info(m)

	return m
}

func createVolumeIfNotExists(ctx context.Context, cli *client.Client) {
	// check if volume exists
	volumeName := "my-ngrok-volume"
	vol, err := cli.VolumeInspect(ctx, volumeName)
	if err != nil {
		// if it doesn't, create it with the right content
		resp, err := cli.ContainerCreate(ctx, &container.Config{
			Image:        internal.AlpineImage,
			Tty:          false, // -d
			AttachStdout: true,
			AttachStderr: true,
			Cmd:          []string{"/bin/sh", "-c", `echo -e "version: 2\nweb_addr: false\n" > /var/lib/ngrok/ngrok.yml`}, // disable the ngrok web UI: https://ngrok.com/docs/ngrok-agent/config#web_addr
			User:         "root",
			Labels: map[string]string{
				"com.docker.desktop.extension":      "true",
				"com.docker.desktop.extension.name": "ngrok Docker Extension",
				"com.docker.compose.project":        "felipecruz_ngrok-docker-extension-desktop-extension",
			},
		}, &container.HostConfig{
			AutoRemove: true,
			Binds: []string{
				volumeName + ":" + "/var/lib/ngrok",
			},
		}, nil, nil, "")
		if err != nil {
			log.Fatal(err) //TODO
		}

		if err := cli.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
			log.Fatal(err) //TODO
		}
	} else {
		log.Infof("Volume %q already exists, created at %q", vol.Name, vol.CreatedAt)
	}
}
