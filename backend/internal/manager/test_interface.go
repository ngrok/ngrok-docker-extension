package manager

import (
	ngrok "golang.ngrok.com/ngrok/v2"
)

// TestEventHandler is an interface for test-specific methods
type TestEventHandler interface {
	CallNgrokEventHandlerForTests(event ngrok.Event)
}
