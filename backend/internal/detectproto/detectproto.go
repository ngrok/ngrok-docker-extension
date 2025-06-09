package detectproto

import (
	"context"
	"crypto/tls"
	"net"
	"strings"
)

// Result represents all protocols detected on the TCP port
type Result struct {
	TCP   bool // Port accepts TCP connections
	HTTP  bool // Port accepts HTTP requests
	HTTPS bool // Port accepts HTTPS requests (TLS + HTTP)
	TLS   bool // Port accepts TLS connections (may or may not be HTTP)
}

// Detect probes the TCP port and returns which protocols are supported
func Detect(ctx context.Context, host, port string) (*Result, error) {
	result := &Result{}

	// Run HTTP and TLS tests concurrently
	httpChan := make(chan httpResult, 1)
	tlsChan := make(chan tlsResult, 1)

	go func() {
		httpChan <- tryHTTP(ctx, host, port)
	}()

	go func() {
		tlsChan <- tryTLS(ctx, host, port)
	}()

	// Wait for both results
	httpRes := <-httpChan
	tlsRes := <-tlsChan

	// Interpret results - TCP is successful if either test established TCP connection
	if httpRes.tcpSuccess || tlsRes.tcpSuccess {
		result.TCP = true
	}

	if httpRes.httpSuccess {
		result.HTTP = true
	}

	if tlsRes.tlsSuccess {
		result.TLS = true
		if tlsRes.supportsHTTP {
			result.HTTPS = true
		}
	}

	return result, nil
}

type httpResult struct {
	tcpSuccess  bool
	httpSuccess bool
	err         error
}

type tlsResult struct {
	tcpSuccess   bool
	tlsSuccess   bool
	supportsHTTP bool
	err          error
}

func tryTLS(ctx context.Context, host, port string) tlsResult {
	// First establish TCP connection
	var dialer net.Dialer
	tcpConn, err := dialer.DialContext(ctx, "tcp", net.JoinHostPort(host, port))
	if err != nil {
		return tlsResult{
			tcpSuccess: false,
			tlsSuccess: false,
			err:        err,
		}
	}
	defer tcpConn.Close()

	// TCP connection successful
	result := tlsResult{tcpSuccess: true}

	// Now try TLS handshake over the TCP connection
	tlsConfig := &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         host,
		NextProtos:         []string{"h2", "http/1.1"}, // Request HTTP protocols
	}

	tlsConn := tls.Client(tcpConn, tlsConfig)
	defer tlsConn.Close()

	// Perform TLS handshake
	err = tlsConn.HandshakeContext(ctx)
	if err != nil {
		result.err = err
		return result
	}

	// TLS handshake successful
	result.tlsSuccess = true

	// Check if server negotiated HTTP protocol via ALPN
	state := tlsConn.ConnectionState()
	negotiatedProto := state.NegotiatedProtocol
	result.supportsHTTP = negotiatedProto == "h2" || negotiatedProto == "http/1.1"

	return result
}

func tryHTTP(ctx context.Context, host, port string) httpResult {
	// First establish TCP connection
	var dialer net.Dialer
	conn, err := dialer.DialContext(ctx, "tcp", net.JoinHostPort(host, port))
	if err != nil {
		return httpResult{
			tcpSuccess:  false,
			httpSuccess: false,
			err:         err,
		}
	}
	defer conn.Close()

	// TCP connection successful
	result := httpResult{tcpSuccess: true}

	// Send distinctive HTTP request for log identification
	request := "GET /ngrok-docker-extension-probe HTTP/1.1\r\n" +
		"Host: ngrok-docker-extension-probe.local\r\n" +
		"User-Agent: ngrok-docker-extension/1.0\r\n" +
		"Connection: close\r\n\r\n"

	// Set deadline for write operation
	if deadline, ok := ctx.Deadline(); ok {
		conn.SetWriteDeadline(deadline)
	}
	_, err = conn.Write([]byte(request))
	if err != nil {
		result.err = err
		return result
	}

	// Read response and check for HTTP status line
	if deadline, ok := ctx.Deadline(); ok {
		conn.SetReadDeadline(deadline)
	}
	response := make([]byte, 1024)
	n, err := conn.Read(response)
	if err != nil {
		result.err = err
		return result
	}

	// Look for HTTP response pattern
	responseStr := string(response[:n])
	if strings.HasPrefix(responseStr, "HTTP/") {
		result.httpSuccess = true
	}

	return result
}
