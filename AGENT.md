# ngrok Docker Extension Agent Guide

## Overview

This repository contains a Docker Desktop Extension that provisions ngrok tunnels for running containers. It is composed of:

- A Go backend (Echo v4, REST, ngrok Go SDK) 
- A React 18 + TypeScript + Vite UI (Material-UI)
- Packaging assets for the Docker Extension platform

Use the directives below when orchestrating builds, tests, CI tasks or automated refactors.

## Command Cheat-Sheet

### Build images
```bash
make build-extension            # production image
make build-extension-dev        # image with curl & debug tools
```

### Install / update into Docker Desktop
```bash
make install-extension          # first-time install
make update-extension           # reinstall after code changes
make install-extension-dev      # install dev image
make update-extension-dev       # update dev image
```

### Live-coding helpers
```bash
make dev-up                     # attach UI hot-reload & enable debug logs
make dev-reset                  # detach UI & clean debug state
```

### Multi-arch publishing
```bash
make prepare-buildx             # one-time setup
make push-extension TAG=1.0.0   # build+push linux/amd64 & linux/arm64
```

### Debugging Commands
```bash
# View extension container logs
docker logs -f ngrok_ngrok-docker-extension-desktop-extension-service

# Inspect extension state
docker exec ngrok_ngrok-docker-extension-desktop-extension-service cat /tmp/state.json

# Test container connectivity from inside extension
docker exec ngrok_ngrok-docker-extension-desktop-extension-service curl http://172.17.0.1:PORT
```

## Repository Map

```
backend/                       Go service
docker-compose.yaml            Runs backend inside Extension VM
Dockerfile                     Multi-stage image for Extension
metadata.json                  Docker Extension manifest (binds backend.sock)
hooks/                         Git hooks and automation scripts
resources/                     Static assets and documentation
ui/                            React 18 + Vite application
Makefile                       Main automation entry
```

## Development Workflow Patterns

### Backend-only change
1. Edit Go files
2. `make update-extension-dev`
3. `docker logs -f ngrok_ngrok-docker-extension-desktop-extension-service`

### Frontend-only change
1. `cd ui && npm run dev`
2. `make dev-up` (route Docker Desktop to localhost:3000)
3. Hot reload in place; no image rebuild required

### Full round-trip integration
1. Code → `make update-extension-dev`
2. (optional) curl over backend.sock inside the container
3. Observe logs, iterate

### Reset environment
```bash
make dev-reset                 # remove UI source map & debug mode
```

## File & Code Organization Principles

### Build & Testing
- Every Makefile target with suffix `-dev` must retain the DEVELOPMENT build-arg
- All multi-arch images are built via buildx; builder name is fixed (`buildx-multi-arch`)