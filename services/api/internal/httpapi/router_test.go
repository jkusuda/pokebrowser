package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jkusuda/pokebrowser/services/api/internal/auth"
	"github.com/jkusuda/pokebrowser/services/api/internal/service"
	"github.com/jkusuda/pokebrowser/services/api/internal/store"
)

var (
	seedAsh   = uuid.MustParse("a5a5a5a5-0000-4000-8000-000000000001")
	seedMisty = uuid.MustParse("a5a5a5a5-0000-4000-8000-000000000002")
	quietLog  = slog.New(slog.NewTextHandler(io.Discard, nil))
)

// fakeVerifier accepts "ash" and "misty" as tokens for the seeded trainers.
type fakeVerifier struct{}

func (fakeVerifier) Verify(_ context.Context, token string) (auth.Identity, error) {
	switch token {
	case "ash":
		return auth.Identity{UserID: seedAsh, Email: "ash@local.test"}, nil
	case "misty":
		return auth.Identity{UserID: seedMisty}, nil
	}
	return auth.Identity{}, auth.ErrInvalidToken
}

func router(svc *service.Service) http.Handler {
	return NewRouter(Deps{Log: quietLog, Verifier: fakeVerifier{}, Service: svc, AllowedOrigins: []string{"http://localhost:3000", "chrome-extension://*"}})
}

func do(h http.Handler, method, path, token, body string, header ...string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for i := 0; i+1 < len(header); i += 2 {
		req.Header.Set(header[i], header[i+1])
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func errorCode(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var body struct {
		Error struct{ Code string } `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("not the error shape: %q", rec.Body.String())
	}
	return body.Error.Code
}

func TestAuthRequired(t *testing.T) {
	h := router(nil)
	for _, token := range []string{"", "forged"} {
		rec := do(h, "GET", "/v1/me", token, "")
		if rec.Code != http.StatusUnauthorized || errorCode(t, rec) != "unauthorized" {
			t.Errorf("token %q: %d %s", token, rec.Code, rec.Body)
		}
	}
	rec := do(h, "GET", "/v1/me", "", "", "Authorization", "Basic Zm9vOmJhcg==")
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("basic auth: %d", rec.Code)
	}
}

func TestUnknownRouteIsJSON(t *testing.T) {
	rec := do(router(nil), "GET", "/v1/nope", "", "")
	if rec.Code != http.StatusNotFound || errorCode(t, rec) != "not_found" {
		t.Errorf("got %d %s", rec.Code, rec.Body)
	}
	if rec.Header().Get("X-Request-Id") == "" {
		t.Error("missing X-Request-Id")
	}
}

func TestCORS(t *testing.T) {
	h := router(nil)
	pre := do(h, "OPTIONS", "/v1/me", "", "", "Origin", "http://localhost:3000", "Access-Control-Request-Method", "PATCH")
	if pre.Code != http.StatusNoContent || pre.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" ||
		!strings.Contains(pre.Header().Get("Access-Control-Allow-Headers"), "Authorization") {
		t.Errorf("preflight: %d %v", pre.Code, pre.Header())
	}
	ext := do(h, "OPTIONS", "/v1/me", "", "", "Origin", "chrome-extension://abcdef", "Access-Control-Request-Method", "GET")
	if ext.Header().Get("Access-Control-Allow-Origin") != "chrome-extension://abcdef" {
		t.Error("extension origin should match the chrome-extension://* pattern")
	}
	other := do(h, "OPTIONS", "/v1/me", "", "", "Origin", "https://evil.test", "Access-Control-Request-Method", "GET")
	if other.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Error("unlisted origin got CORS headers")
	}
}

func TestErrorsAndPanicsAreHidden(t *testing.T) {
	s := &server{log: quietLog}
	h := s.recoverPanics(s.handle(func(http.ResponseWriter, *http.Request) error {
		return errors.New("secret detail: connection reset")
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	if rec.Code != http.StatusInternalServerError || strings.Contains(rec.Body.String(), "secret") {
		t.Errorf("internal error: %d %s", rec.Code, rec.Body)
	}

	h = s.recoverPanics(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("boom") }))
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	if rec.Code != http.StatusInternalServerError {
		t.Errorf("panic: %d", rec.Code)
	}
}

// TestRoutes runs a few requests through the real router and service against
// the seeded local database.
func TestRoutes(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	st, err := store.Open(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	catalog, err := st.Q().LoadCatalog(ctx)
	if err != nil {
		t.Fatal(err)
	}
	h := router(service.New(st, catalog, quietLog))

	rec := do(h, "GET", "/v1/me", "ash", "")
	var me service.Me
	if rec.Code != http.StatusOK || json.Unmarshal(rec.Body.Bytes(), &me) != nil || me.Profile.TrainerName != "Ash" {
		t.Fatalf("GET /v1/me: %d %s", rec.Code, rec.Body)
	}

	cases := []struct {
		method, path, token, body string
		status                    int
		code                      string
	}{
		{"GET", "/healthz", "", "", 200, ""},
		{"GET", "/v1/me/status", "ash", "", 200, ""},
		{"PATCH", "/v1/me/settings", "ash", `{"theme":"purple"}`, 400, "invalid_theme"},
		{"PATCH", "/v1/me/settings", "ash", `{"nope":1}`, 400, "invalid_request"},
		{"POST", "/v1/catches", "ash", `{"nonce":"` + uuid.NewString() + `"}`, 409, "no_pending_encounter"},
		{"PATCH", "/v1/pokemon/not-a-uuid", "ash", `{"nickname":"x"}`, 400, "invalid_id"},
		{"GET", "/v1/leaderboard?category=catches", "ash", "", 200, ""},
		{"GET", "/v1/leaderboard?category=steps", "ash", "", 400, "invalid_category"},
		{"GET", "/v1/trainers/" + me.Profile.FriendCode, "misty", "", 200, ""},
		{"GET", "/v1/events", "ash", "", 200, ""},
		{"GET", "/v1/admin/events", "ash", "", 200, ""},
		{"GET", "/v1/admin/events", "misty", "", 404, "not_found"},
		{"POST", "/v1/achievements/nope/claim", "ash", "", 400, "unknown_achievement"},
	}
	for _, c := range cases {
		rec := do(h, c.method, c.path, c.token, c.body)
		if rec.Code != c.status || (c.code != "" && errorCode(t, rec) != c.code) {
			t.Errorf("%s %s: %d %s", c.method, c.path, rec.Code, rec.Body)
		}
	}
}
