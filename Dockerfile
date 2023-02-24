FROM golang:1.19-alpine AS builder
ENV CGO_ENABLED=0
WORKDIR /backend
COPY backend/go.* .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download
COPY backend/. .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -trimpath -ldflags="-s -w" -o bin/service

FROM --platform=$BUILDPLATFORM node:18.12-alpine3.16 AS client-builder
WORKDIR /ui
# cache packages in layer
COPY ui/package.json /ui/package.json
COPY ui/package-lock.json /ui/package-lock.json
RUN --mount=type=cache,target=/usr/src/app/.npm \
    npm set cache /usr/src/app/.npm && \
    npm ci
# install
COPY ui /ui
RUN npm run build

FROM alpine
LABEL org.opencontainers.image.title="ngrok" \
    org.opencontainers.image.description="Expose your containers to the public internet using ngrok tunnels." \
    org.opencontainers.image.vendor="ngrok" \
    com.docker.desktop.extension.api.version="0.3.0" \
    com.docker.desktop.extension.icon="https://avatars.githubusercontent.com/u/10625446?s=200" \
    com.docker.extension.screenshots="[{\"alt\":\"containers\", \"url\":\"https://i.postimg.cc/vHrP3Gns/containers.png\"},{\"alt\":\"settings\", \"url\":\"https://i.postimg.cc/vHsh1CNS/settings.png\"}]" \
    com.docker.extension.detailed-description="Use this extension to expose the containers that have published ports in Docker Desktop to the public internet using ngrok tunnels." \
    com.docker.extension.publisher-url="https://twitter.com/felipecruz" \
    com.docker.extension.additional-urls="" \
    com.docker.extension.changelog="" \
    com.docker.extension.categories="networking,utility-tools"

COPY --from=builder /backend/bin/service /
COPY docker-compose.yaml .
COPY metadata.json .
COPY ngrok.svg .
COPY --from=client-builder /ui/build ui
CMD /service -socket /run/guest-services/backend.sock
