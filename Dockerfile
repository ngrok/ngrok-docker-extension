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
    org.opencontainers.image.description="ngrok provides instant secure ingress to any container running locally on your machine from anywhere in the world." \
    org.opencontainers.image.vendor="ngrok" \
    org.opencontainers.image.authors="ngrok" \
    com.docker.desktop.extension.api.version="0.1.0" \
    com.docker.desktop.extension.icon="https://raw.githubusercontent.com/ngrok/ngrok-docs/61d48c4bf3b8f0b537d273986b5428cd6735a480/static/img/docker/ngrok.svg" \
    com.docker.extension.screenshots="[{\"alt\":\"containers\", \"url\":\"https://raw.githubusercontent.com/ngrok/ngrok-docs/61d48c4bf3b8f0b537d273986b5428cd6735a480/static/img/docker/containers.png\"},{\"alt\":\"settings\", \"url\":\"https://raw.githubusercontent.com/ngrok/ngrok-docs/61d48c4bf3b8f0b537d273986b5428cd6735a480/static/img/docker/settings.png\"}]" \
    com.docker.extension.detailed-description="This extension uses ngrok to create ingress to any Docker container with published TCP ports." \
    com.docker.extension.publisher-url="https://ngrok.com" \
    com.docker.extension.additional-urls="[{\"title\":\"ngrok Documentation\",\"url\":\"https://ngrok.com/docs\"}]" \
    com.docker.extension.changelog="<ul><li>Initial release</li></ul>" \
    com.docker.extension.categories="networking,utility-tools" \
    com.docker.extension.account-info="required"

COPY --from=builder /backend/bin/service /
COPY docker-compose.yaml .
COPY metadata.json .
COPY /ngrok.svg ./ngrok.svg
COPY --from=client-builder /ui/build ui
CMD /service -socket /run/guest-services/backend.sock
