package httpapi

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/jkusuda/pokebrowser/services/api/internal/auth"
	"github.com/jkusuda/pokebrowser/services/api/internal/errs"
	"github.com/jkusuda/pokebrowser/services/api/internal/metrics"
	"github.com/jkusuda/pokebrowser/services/api/internal/service"
)

type TokenVerifier interface {
	Verify(ctx context.Context, token string) (auth.Identity, error)
}

type Deps struct {
	Log            *slog.Logger
	Verifier       TokenVerifier
	Service        *service.Service
	Metrics        *metrics.Metrics
	AllowedOrigins []string
}

type server struct {
	log            *slog.Logger
	verifier       TokenVerifier
	svc            *service.Service
	metrics        *metrics.Metrics
	allowedOrigins []string
}

func NewRouter(d Deps) http.Handler {
	s := &server{log: d.Log, verifier: d.Verifier, svc: d.Service, metrics: d.Metrics, allowedOrigins: d.AllowedOrigins}

	mux := http.NewServeMux()
	user := func(pattern string, h handlerFunc) { mux.Handle(pattern, s.requireAuth(s.handle(h))) }
	admin := func(pattern string, h handlerFunc) { mux.Handle(pattern, s.requireAdmin(s.handle(h))) }

	mux.Handle("GET /healthz", s.handle(s.health))

	user("GET /v1/me", s.getMe)
	user("GET /v1/me/status", s.getStatus)
	user("PATCH /v1/me", s.updateProfile)
	user("PATCH /v1/me/settings", s.updateSettings)
	user("PUT /v1/me/badges", s.setBadges)

	user("POST /v1/encounters/roll", s.roll)
	user("POST /v1/catches", s.catch)

	user("GET /v1/pokemon", s.listPokemon)
	user("PATCH /v1/pokemon/{id}", s.renamePokemon)
	user("DELETE /v1/pokemon/{id}", s.releasePokemon)
	user("POST /v1/pokemon/{id}/evolve", s.evolvePokemon)

	user("GET /v1/achievements", s.listAchievements)
	user("POST /v1/achievements/{id}/claim", s.claimAchievement)
	user("POST /v1/tokens/{id}/open", s.openToken)
	user("PATCH /v1/tokens/{id}", s.setTokenType)
	user("POST /v1/rewards/candy", s.claimCandy)

	user("POST /v1/friends", s.addFriend)
	user("POST /v1/friends/{id}/accept", s.acceptFriend)
	user("DELETE /v1/friends/{id}", s.removeFriend)
	user("GET /v1/trainers/{code}", s.friendProfile)

	user("GET /v1/leaderboard", s.leaderboard)
	user("GET /v1/events", s.events)
	user("GET /v1/events/{id}/leaderboard", s.eventLeaderboard)

	admin("GET /v1/admin/events", s.adminEvents)
	admin("POST /v1/admin/events", s.createEvent)
	admin("PUT /v1/admin/events/{id}", s.updateEvent)
	admin("DELETE /v1/admin/events/{id}", s.deleteEvent)
	admin("POST /v1/admin/xp", s.adminAddXP)
	admin("POST /v1/admin/tokens", s.adminGrantToken)
	admin("POST /v1/admin/achievements", s.adminUnlock)

	mux.Handle("/", s.handle(func(http.ResponseWriter, *http.Request) error { return errs.RouteMissing }))

	var h http.Handler = mux
	h = s.cors(h)
	h = s.logRequests(h)
	h = requestID(h)
	h = s.recoverPanics(h)
	return h
}

func (s *server) health(w http.ResponseWriter, r *http.Request) error {
	if err := s.svc.Ping(r.Context()); err != nil {
		s.log.ErrorContext(r.Context(), "health check failed", "err", err)
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "database unavailable"})
		return nil
	}
	return ok(w, map[string]string{"status": "ok"})
}
