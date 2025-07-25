package detectproto

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"fmt"
	"math/big"
	"net"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Test helpers

func generateTestCert() tls.Certificate {
	priv, _ := rsa.GenerateKey(rand.Reader, 2048)
	template := x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{Organization: []string{"Test"}},
		NotBefore:    time.Now(),
		NotAfter:     time.Now().Add(time.Hour),
		KeyUsage:     x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		IPAddresses:  []net.IP{net.IPv4(127, 0, 0, 1)},
		DNSNames:     []string{"localhost"},
	}
	certDER, _ := x509.CreateCertificate(rand.Reader, &template, &template, &priv.PublicKey, priv)
	return tls.Certificate{Certificate: [][]byte{certDER}, PrivateKey: priv}
}

func startHTTPServer(t *testing.T) (int, func()) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	port := listener.Addr().(*net.TCPAddr).Port

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	server := &http.Server{Handler: mux}
	go server.Serve(listener)

	cleanup := func() {
		server.Close()
		listener.Close()
	}

	time.Sleep(10 * time.Millisecond) // Let server start
	return port, cleanup
}

func startHTTPSServer(t *testing.T, alpnProtos []string) (int, func()) {
	cert := generateTestCert()
	tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{cert},
		NextProtos:   alpnProtos,
	}

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	port := listener.Addr().(*net.TCPAddr).Port

	// Raw TLS server that only accepts TLS connections
	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			go func(c net.Conn) {
				defer c.Close()
				tlsConn := tls.Server(c, tlsConfig)
				defer tlsConn.Close()
				if err := tlsConn.Handshake(); err != nil {
					return
				}
				// Send HTTP response over TLS
				response := "HTTP/1.1 200 OK\r\nContent-Length: 8\r\n\r\nHTTPS OK"
				tlsConn.Write([]byte(response))
			}(conn)
		}
	}()

	cleanup := func() {
		listener.Close()
	}

	time.Sleep(10 * time.Millisecond)
	return port, cleanup
}

func startTLSServer(t *testing.T, alpnProtos []string) (int, func()) {
	cert := generateTestCert()
	tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{cert},
		NextProtos:   alpnProtos,
	}

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	port := listener.Addr().(*net.TCPAddr).Port

	tlsListener := tls.NewListener(listener, tlsConfig)

	go func() {
		for {
			conn, err := tlsListener.Accept()
			if err != nil {
				return
			}
			go func(c net.Conn) {
				defer c.Close()
				// Simple echo server
				buffer := make([]byte, 1024)
				n, _ := c.Read(buffer)
				c.Write(buffer[:n])
			}(conn)
		}
	}()

	cleanup := func() {
		tlsListener.Close()
		listener.Close()
	}

	time.Sleep(10 * time.Millisecond)
	return port, cleanup
}

// Core tests

func TestProtocolDetection(t *testing.T) {
	ctx := context.Background()
	detector := NewDetector()

	tests := []struct {
		name     string
		setup    func(t *testing.T) (int, func())
		expected Result
	}{
		{
			name:     "HTTP server",
			setup:    func(t *testing.T) (int, func()) { return startHTTPServer(t) },
			expected: Result{TCP: true, HTTP: true, HTTPS: false, TLS: false},
		},
		{
			name:     "HTTPS server with HTTP ALPN",
			setup:    func(t *testing.T) (int, func()) { return startHTTPSServer(t, []string{"h2", "http/1.1"}) },
			expected: Result{TCP: true, HTTP: false, HTTPS: true, TLS: true},
		},
		{
			name:     "TLS server without HTTP ALPN",
			setup:    func(t *testing.T) (int, func()) { return startTLSServer(t, nil) },
			expected: Result{TCP: true, HTTP: false, HTTPS: false, TLS: true},
		},
		{
			name:     "Non-existent service",
			setup:    func(t *testing.T) (int, func()) { return 99999, func() {} },
			expected: Result{TCP: false, HTTP: false, HTTPS: false, TLS: false},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			port, cleanup := tt.setup(t)
			defer cleanup()

			ctx, cancel := context.WithTimeout(ctx, 1*time.Second)
			defer cancel()

			result, err := detector.Detect(ctx, "127.0.0.1", fmt.Sprintf("%d", port))
			require.NoError(t, err)
			assert.Equal(t, tt.expected, *result)
		})
	}
}

func TestTimeoutBehavior(t *testing.T) {
	detector := NewDetector()
	
	// Start a server that accepts connections but responds slowly
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	defer listener.Close()
	port := listener.Addr().(*net.TCPAddr).Port

	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			go func(c net.Conn) {
				defer c.Close()
				time.Sleep(200 * time.Millisecond) // Slow response
				buffer := make([]byte, 1024)
				c.Read(buffer)
				c.Write([]byte("HTTP/1.1 200 OK\r\n\r\nOK"))
			}(conn)
		}
	}()

	time.Sleep(10 * time.Millisecond)

	// Test with short timeout - should detect TCP but not HTTP
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	result, err := detector.Detect(ctx, "127.0.0.1", fmt.Sprintf("%d", port))
	require.NoError(t, err)
	assert.True(t, result.TCP, "TCP connection should succeed")
	assert.False(t, result.HTTP, "HTTP should timeout")
	assert.False(t, result.HTTPS)
	assert.False(t, result.TLS)
}

func TestInvalidInputs(t *testing.T) {
	detector := NewDetector()
	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	tests := []struct {
		name string
		host string
		port string
	}{
		{"empty host", "", "80"},
		{"empty port", "127.0.0.1", ""},
		{"invalid port", "127.0.0.1", "invalid"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := detector.Detect(ctx, tt.host, tt.port)
			require.NoError(t, err)
			assert.False(t, result.TCP)
			assert.False(t, result.HTTP)
			assert.False(t, result.HTTPS)
			assert.False(t, result.TLS)
		})
	}
}
