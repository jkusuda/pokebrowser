package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jkusuda/pokebrowser/services/api/internal/auth"
	"github.com/jkusuda/pokebrowser/services/api/internal/errs"
)

// requestInfo lets requireAuth report the caller back out to logRequests.
type requestInfo struct{ userID string }

type infoKey struct{}

func infoFrom(r *http.Request) *requestInfo {
	info, _ := r.Context().Value(infoKey{}).(*requestInfo)
	return info
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (s *server) recoverPanics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				if v == http.ErrAbortHandler {
					panic(v)
				}
				s.writeError(w, r, fmt.Errorf("panic: %v", v))
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func requestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b := make([]byte, 8)
		rand.Read(b)
		w.Header().Set("X-Request-Id", hex.EncodeToString(b))
		ctx := context.WithValue(r.Context(), infoKey{}, &requestInfo{})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)

		attrs := []any{
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(start).Milliseconds(),
			"request_id", w.Header().Get("X-Request-Id"),
		}
		if info := infoFrom(r); info != nil && info.userID != "" {
			attrs = append(attrs, "user_id", info.userID)
		}
		s.log.InfoContext(r.Context(), "request", attrs...)
	})
}

func (s *server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" || !s.originAllowed(origin) {
			next.ServeHTTP(w, r)
			return
		}
		h := w.Header()
		h.Set("Access-Control-Allow-Origin", origin)
		h.Add("Vary", "Origin")
		h.Set("Access-Control-Expose-Headers", "X-Request-Id")
		if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
			h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE")
			h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			h.Set("Access-Control-Max-Age", "600")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// originAllowed matches exact origins, or prefixes ending in "*" such as
// "chrome-extension://*" (extension ids differ per install).
func (s *server) originAllowed(origin string) bool {
	for _, o := range s.allowedOrigins {
		if prefix, ok := strings.CutSuffix(o, "*"); ok && strings.HasPrefix(origin, prefix) || o == origin {
			return true
		}
	}
	return false
}

func (s *server) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || token == "" {
			s.writeError(w, r, errs.Unauthorized)
			return
		}
		id, err := s.verifier.Verify(r.Context(), token)
		if err != nil {
			s.log.DebugContext(r.Context(), "token rejected", "err", err)
			s.writeError(w, r, errs.Unauthorized)
			return
		}
		if info := infoFrom(r); info != nil {
			info.userID = id.UserID.String()
		}
		next.ServeHTTP(w, r.WithContext(auth.WithIdentity(r.Context(), id)))
	})
}

// requireAdmin answers 404 to non-admins so admin routes aren't discoverable.
func (s *server) requireAdmin(next http.Handler) http.Handler {
	return s.requireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		admin, err := s.svc.IsAdmin(r.Context(), caller(r).UserID)
		if err != nil || !admin {
			s.writeError(w, r, errs.RouteMissing)
			return
		}
		next.ServeHTTP(w, r)
	}))
}
