package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/jkusuda/pokebrowser/services/api/internal/auth"
	"github.com/jkusuda/pokebrowser/services/api/internal/errs"
)

type handlerFunc func(w http.ResponseWriter, r *http.Request) error

func (s *server) handle(h handlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := h(w, r); err != nil {
			s.writeError(w, r, err)
		}
	})
}

// writeError hides anything that isn't an *errs.Error behind a generic 500.
func (s *server) writeError(w http.ResponseWriter, r *http.Request, err error) {
	var apiErr *errs.Error
	if !errors.As(err, &apiErr) {
		s.log.ErrorContext(r.Context(), "internal error", "err", err, "path", r.URL.Path)
		apiErr = &errs.Error{Status: http.StatusInternalServerError, Code: "internal", Message: "Something went wrong"}
	}
	writeJSON(w, apiErr.Status, map[string]any{
		"error": map[string]string{"code": apiErr.Code, "message": apiErr.Message},
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Default().Error("encode response", "err", err)
	}
}

func ok(w http.ResponseWriter, v any) error {
	writeJSON(w, http.StatusOK, v)
	return nil
}

func noContent(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusNoContent)
	return nil
}

func decode(r *http.Request, v any) error { return decodeBody(r, v, false) }

// decodeOptional is decode for endpoints whose body may be empty.
func decodeOptional(r *http.Request, v any) error { return decodeBody(r, v, true) }

func decodeBody(r *http.Request, v any, optional bool) error {
	dec := json.NewDecoder(io.LimitReader(r.Body, 64<<10))
	dec.DisallowUnknownFields()
	err := dec.Decode(v)
	if optional && errors.Is(err, io.EOF) {
		return nil
	}
	if err != nil {
		return errs.BadRequest("invalid_request", fmt.Sprintf("Invalid JSON body: %v", err))
	}
	return nil
}

func pathID(r *http.Request) (uuid.UUID, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return uuid.Nil, errs.BadRequest("invalid_id", "Invalid id")
	}
	return id, nil
}

func queryInt(r *http.Request, name string, fallback int) (int, error) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, errs.BadRequest("invalid_request", name+" must be a number")
	}
	return n, nil
}

func caller(r *http.Request) auth.Identity {
	id, _ := auth.FromContext(r.Context())
	return id
}
