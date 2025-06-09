FROM golang:1.24.2-alpine AS builder
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

# Build arguments
ARG VERSION=0.1.0
ARG DEVELOPMENT=false

# Make version available as environment variable
ENV EXTENSION_VERSION="${VERSION}"

LABEL org.opencontainers.image.title="ngrok" \
    org.opencontainers.image.description="Put your containers online with ngrok's API Gateway." \
    org.opencontainers.image.vendor="ngrok" \
    com.docker.desktop.extension.api.version="${VERSION}" \
    com.docker.desktop.extension.icon="https://user-images.githubusercontent.com/550861/222650471-a1908709-8920-406b-a55d-b8231cd3a4a5.svg" \
    com.docker.extension.screenshots="[{\"alt\":\"containers\", \"url\":\"https://user-images.githubusercontent.com/550861/222644761-b30982aa-e81a-4546-9678-dadfc731e0fc.png\"},{\"alt\":\"settings\", \"url\":\"https://user-images.githubusercontent.com/550861/222644829-3b717704-5b58-455f-b729-dad4c96daf18.png\"}]" \
    com.docker.extension.detailed-description="Use this extension to connect the containers that have published ports in Docker Desktop to the public internet using ngrok endpoints." \
    com.docker.extension.publisher-url="https://ngrok.com" \
    com.docker.extension.additional-urls="[{\"title\":\"Docs\",\"url\":\"https://ngrok.com/docs\"}]" \
    com.docker.extension.changelog="<ul><li>Support for HTTP endpoints</li><li>Multiple endpoints in single session</li></ul>" \
    com.docker.extension.categories="networking,utility-tools" \
    com.docker.extension.account-info="required"

# Conditionally install development tools
RUN if [ "$DEVELOPMENT" = "true" ]; then \
        apk add --no-cache curl; \
    fi

COPY --from=builder /backend/bin/service /
COPY docker-compose.yaml .
COPY metadata.json .
COPY ngrok.svg .
COPY --from=client-builder /ui/build ui
CMD /service -socket /run/guest-services/backend.sock
