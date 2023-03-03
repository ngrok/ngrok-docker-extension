package handler

import (
	"context"
	"io"
	"os"
	"runtime"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"golang.org/x/sync/errgroup"

	"github.com/ngrok/ngrok-docker-extension/internal"
	"github.com/ngrok/ngrok-docker-extension/internal/log"
)

type Handler struct {
	DockerClient func() (*client.Client, error)
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
