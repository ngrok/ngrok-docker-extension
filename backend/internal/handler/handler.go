package handler

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"runtime"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"golang.org/x/sync/errgroup"

	"github.com/ngrok/ngrok-docker-extension/internal"
)

type Handler struct {
	DockerClient func() (*client.Client, error)
	logger       *slog.Logger
}

func New(ctx context.Context, cliFactory func() (*client.Client, error), logger *slog.Logger) (*Handler, error) {
	cli, err := cliFactory()
	if err != nil {
		return nil, fmt.Errorf("failed to create docker client: %w", err)
	}

	h := &Handler{
		DockerClient: cliFactory,
		logger:       logger,
	}

	if err := h.pullImagesIfNotPresent(ctx, cli); err != nil {
		return nil, fmt.Errorf("failed to pull required images: %w", err)
	}

	if err := h.createVolumeIfNotExists(ctx, cli); err != nil {
		return nil, fmt.Errorf("failed to create volume: %w", err)
	}

	return h, nil
}

func (h *Handler) pullImagesIfNotPresent(ctx context.Context, cli *client.Client) error {
	g, ctx := errgroup.WithContext(ctx)

	images := []string{
		internal.AlpineImage,
	}

	for _, image := range images {
		image := image // https://golang.org/doc/faq#closures_and_goroutines
		g.Go(func() error {
			_, _, err := cli.ImageInspectWithRaw(ctx, image)
			if err != nil {
				h.logger.Info("Pulling Image", "image", image)
				reader, pullErr := cli.ImagePull(ctx, image, types.ImagePullOptions{
					Platform: "linux/" + runtime.GOARCH,
				})
				if pullErr != nil {
					return fmt.Errorf("failed to pull image %s: %w", image, pullErr)
				}
				_, copyErr := io.Copy(os.Stdout, reader)
				if copyErr != nil {
					return fmt.Errorf("failed to copy image pull output for %s: %w", image, copyErr)
				}
			}

			return nil
		})
	}

	// wait for all the pull operations to complete
	if err := g.Wait(); err != nil {
		return fmt.Errorf("failed to pull one or more images: %w", err)
	}
	
	h.logger.Info("Successfully pulled all the images")
	return nil
}

func (h *Handler) createVolumeIfNotExists(ctx context.Context, cli *client.Client) error {
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
			return fmt.Errorf("failed to create container for volume setup: %w", err)
		}

		if err := cli.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
			return fmt.Errorf("failed to start container for volume setup: %w", err)
		}
	} else {
		h.logger.Info("Volume already exists", "name", vol.Name, "createdAt", vol.CreatedAt)
	}
	
	return nil
}
