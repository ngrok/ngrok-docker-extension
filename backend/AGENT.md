# Backend Agent Instructions

## Commands

### Build and Test Commands
```bash
# Build the backend
go build .

# Run tests
go test ./...
go test ./internal/detectproto

# Run with specific flags
go run . -socket /run/guest/ext.sock

# Lint and format
go fmt ./...
go vet ./...

# Update dependencies
go mod download
go mod tidy
```

### Development Commands
```bash
# Install extension for development
make install-extension-dev

# Build extension with dev tools
make build-extension-dev

# Start development mode
make dev-up
```

## Project Structure

```
backend/
├── main.go                    # Entry point, signal handling, socket setup
├── extension.go               # Core extension struct, HTTP router setup
├── go.mod                     # Go module dependencies
└── internal/
    ├── handler/               # HTTP request handlers
    │   ├── handler.go         # Router setup, handler registration
    │   ├── types.go           # Request/response type definitions
    │   ├── configure_agent.go # POST /configure_agent
    │   ├── create_endpoint.go # POST /create_endpoint  
    │   ├── remove_endpoint.go # POST /remove_endpoint
    │   ├── list_endpoints.go  # GET /list_endpoints
    │   ├── agent_status.go    # GET /agent_status
    │   └── detect_protocol.go # POST /detect_protocol
    ├── endpoint/              # Ngrok endpoint management
    │   └── endpoint.go        # Manager interface, endpoint lifecycle
    └── detectproto/           # Protocol detection
        ├── detectproto.go     # TCP/HTTP/HTTPS/TLS detection logic
        └── detectproto_test.go # Protocol detection tests
```

## Key Components

### Extension Core (`extension.go`)
- Main application struct with Echo router, logger, endpoint manager
- Unix socket listener on `/run/guest/ext.sock`

### Handler Package (`internal/handler/`)
- REST API handlers for frontend communication
- Input validation and error responses
- Request/response type definitions in `types.go`

### Endpoint Manager (`internal/endpoint/`)
- Manages ngrok agent configuration and lifecycle
- Creates/removes ngrok endpoints for container ports  
- Thread-safe endpoint storage with composite keys (`containerID:targetPort`)
- Auto-disconnect capability when no endpoints remain
- Connection status tracking with latency metrics

### Protocol Detection (`internal/detectproto/`)
- Concurrent TCP/HTTP/HTTPS/TLS protocol detection
- Uses Docker bridge IP `172.17.0.1` for container access

## REST API Endpoints

### POST /configure_agent
Configure ngrok agent with auth token
- **Body**: `{token: string, connectURL?: string, autoDisconnect?: bool}`
- **Response**: 200 OK or 401 Unauthorized

### POST /create_endpoint
Create ngrok endpoint for container port
- **Body**: `{containerId: string, targetPort: string, binding?: string, url?: string, ...}`
- **Response**: `{endpoint: {id, url, containerId, targetPort, lastStarted}}`

### POST /remove_endpoint  
Remove ngrok endpoint
- **Body**: `{containerId: string, targetPort: string}`
- **Response**: `{remainingEndpoints: []}`

### GET /list_endpoints
List all active endpoints
- **Response**: `{endpoints: []}`

### GET /agent_status
Get ngrok agent connection status
- **Response**: `{status, timestamp, connectionLatency, lastError}`

### POST /detect_protocol
Detect protocols on container port
- **Body**: `{container_id: string, port: string}`
- **Response**: `{tcp: bool, http: bool, https: bool, tls: bool}`

## Go Patterns

### Error Handling
- Wrap errors with context: `fmt.Errorf("operation failed: %w", err)`
- Log errors before returning: `h.logger.Error("message", "error", err)`
- Return typed error responses: `ErrorResponse{Error: "message"}`
- Use context.Context for all blocking (e.g. network) operations

### Dependencies
- Echo v4 for HTTP router and middleware
- ngrok SDK v2 for tunnel endpoint management  
- slog for structured logging
- testify for test assertions

### Logging
- Structured logging with key-value pairs: `logger.Info("message", "key", value)`
- Log levels: Info, Warn, Error
- JSON format output to stdout

## Common Tasks

### Add New Endpoint
1. Define request/response types in `types.go`
2. Add handler function in new file: `internal/handler/feature.go`  
3. Register route in `handler.go`: `router.POST("/path", h.HandlerFunc)`
4. Add endpoint manager method if needed
5. Write tests for handler logic