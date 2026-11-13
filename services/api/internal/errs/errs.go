// Package errs defines errors that are safe to show to API clients.
package errs

import "net/http"

// Error is written to clients as {"error": {"code", "message"}}. Codes reuse
// the strings the old SQL functions raised, so client error handling carries over.
type Error struct {
	Status  int
	Code    string
	Message string
}

func (e *Error) Error() string { return e.Code + ": " + e.Message }

func BadRequest(code, msg string) *Error { return &Error{http.StatusBadRequest, code, msg} }
func Forbidden(code, msg string) *Error  { return &Error{http.StatusForbidden, code, msg} }
func NotFound(code, msg string) *Error   { return &Error{http.StatusNotFound, code, msg} }
func Conflict(code, msg string) *Error   { return &Error{http.StatusConflict, code, msg} }
func TooMany(code, msg string) *Error    { return &Error{http.StatusTooManyRequests, code, msg} }

var (
	Unauthorized = &Error{http.StatusUnauthorized, "unauthorized", "Sign in required"}
	RouteMissing = NotFound("not_found", "Not found")
)
