package httpapi

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/jkusuda/pokebrowser/services/api/internal/game"
	"github.com/jkusuda/pokebrowser/services/api/internal/service"
)

type unlocked struct {
	NewAchievements []string `json:"newAchievements"`
}

func (s *server) getMe(w http.ResponseWriter, r *http.Request) error {
	me, err := s.svc.Me(r.Context(), caller(r))
	if err != nil {
		return err
	}
	return ok(w, me)
}

func (s *server) getStatus(w http.ResponseWriter, r *http.Request) error {
	st, err := s.svc.Status(r.Context(), caller(r).UserID)
	if err != nil {
		return err
	}
	return ok(w, st)
}

func (s *server) updateProfile(w http.ResponseWriter, r *http.Request) error {
	var in service.ProfileInput
	if err := decode(r, &in); err != nil {
		return err
	}
	ids, err := s.svc.UpdateProfile(r.Context(), caller(r).UserID, in)
	if err != nil {
		return err
	}
	return ok(w, unlocked{ids})
}

func (s *server) updateSettings(w http.ResponseWriter, r *http.Request) error {
	var in service.SettingsInput
	if err := decode(r, &in); err != nil {
		return err
	}
	settings, err := s.svc.UpdateSettings(r.Context(), caller(r).UserID, in)
	if err != nil {
		return err
	}
	return ok(w, settings)
}

func (s *server) setBadges(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		BadgeIDs []string `json:"badgeIds"`
	}
	if err := decode(r, &in); err != nil {
		return err
	}
	if err := s.svc.SetBadges(r.Context(), caller(r).UserID, in.BadgeIDs); err != nil {
		return err
	}
	return noContent(w)
}

func (s *server) roll(w http.ResponseWriter, r *http.Request) error {
	res, err := s.svc.Roll(r.Context(), caller(r).UserID)
	if err != nil {
		return err
	}
	return ok(w, res)
}

func (s *server) catch(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Nonce    uuid.UUID `json:"nonce"`
		CaughtOn string    `json:"caughtOn"`
	}
	if err := decode(r, &in); err != nil {
		return err
	}
	res, err := s.svc.Catch(r.Context(), caller(r).UserID, in.Nonce, in.CaughtOn)
	if err != nil {
		return err
	}
	return ok(w, res)
}

func (s *server) listPokemon(w http.ResponseWriter, r *http.Request) error {
	limit, err := queryInt(r, "recent", 0)
	if err != nil {
		return err
	}
	list, err := s.svc.RecentPokemon(r.Context(), caller(r).UserID, limit)
	if err != nil {
		return err
	}
	return ok(w, list)
}

func (s *server) renamePokemon(w http.ResponseWriter, r *http.Request) error {
	id, err := pathID(r)
	if err != nil {
		return err
	}
	var in struct {
		Nickname string `json:"nickname"`
	}
	if err := decode(r, &in); err != nil {
		return err
	}
	ids, err := s.svc.Rename(r.Context(), caller(r).UserID, id, in.Nickname)
	if err != nil {
		return err
	}
	return ok(w, unlocked{ids})
}

func (s *server) releasePokemon(w http.ResponseWriter, r *http.Request) error {
	id, err := pathID(r)
	if err != nil {
		return err
	}
	ids, err := s.svc.Release(r.Context(), caller(r).UserID, id)
	if err != nil {
		return err
	}
	return ok(w, unlocked{ids})
}

func (s *server) evolvePokemon(w http.ResponseWriter, r *http.Request) error {
	id, err := pathID(r)
	if err != nil {
		return err
	}
	var in struct {
		TargetID int `json:"targetId"`
	}
	if err := decodeOptional(r, &in); err != nil {
		return err
	}
	res, err := s.svc.Evolve(r.Context(), caller(r).UserID, id, in.TargetID)
	if err != nil {
		return err
	}
	return ok(w, res)
}

func (s *server) listAchievements(w http.ResponseWriter, r *http.Request) error {
	list, err := s.svc.Achievements(r.Context(), caller(r).UserID)
	if err != nil {
		return err
	}
	return ok(w, list)
}

func (s *server) claimAchievement(w http.ResponseWriter, r *http.Request) error {
	res, err := s.svc.ClaimAchievement(r.Context(), caller(r).UserID, r.PathValue("id"))
	if err != nil {
		return err
	}
	return ok(w, res)
}

func (s *server) openToken(w http.ResponseWriter, r *http.Request) error {
	id, err := pathID(r)
	if err != nil {
		return err
	}
	res, err := s.svc.OpenToken(r.Context(), caller(r).UserID, id)
	if err != nil {
		return err
	}
	return ok(w, res)
}

func (s *server) setTokenType(w http.ResponseWriter, r *http.Request) error {
	id, err := pathID(r)
	if err != nil {
		return err
	}
	var in struct {
		TypeFilter string `json:"typeFilter"`
	}
	if err := decode(r, &in); err != nil {
		return err
	}
	if err := s.svc.SetTokenType(r.Context(), caller(r).UserID, id, in.TypeFilter); err != nil {
		return err
	}
	return noContent(w)
}

func (s *server) claimCandy(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		PokedexNumber int `json:"pokedexNumber"`
	}
	if err := decode(r, &in); err != nil {
		return err
	}
	if err := s.svc.ClaimCandy(r.Context(), caller(r).UserID, in.PokedexNumber); err != nil {
		return err
	}
	return noContent(w)
}

func (s *server) addFriend(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		FriendCode string `json:"friendCode"`
	}
	if err := decode(r, &in); err != nil {
		return err
	}
	id, err := s.svc.AddFriend(r.Context(), caller(r).UserID, in.FriendCode)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusCreated, map[string]uuid.UUID{"friendshipId": id})
	return nil
}

func (s *server) acceptFriend(w http.ResponseWriter, r *http.Request) error {
	id, err := pathID(r)
	if err != nil {
		return err
	}
	ids, err := s.svc.AcceptFriend(r.Context(), caller(r).UserID, id)
	if err != nil {
		return err
	}
	return ok(w, unlocked{ids})
}

func (s *server) removeFriend(w http.ResponseWriter, r *http.Request) error {
	id, err := pathID(r)
	if err != nil {
		return err
	}
	if err := s.svc.RemoveFriend(r.Context(), caller(r).UserID, id); err != nil {
		return err
	}
	return noContent(w)
}

func (s *server) friendProfile(w http.ResponseWriter, r *http.Request) error {
	p, err := s.svc.FriendProfile(r.Context(), caller(r).UserID, r.PathValue("code"))
	if err != nil {
		return err
	}
	return ok(w, p)
}

func (s *server) leaderboard(w http.ResponseWriter, r *http.Request) error {
	q := r.URL.Query()
	scope := q.Get("scope")
	if scope == "" {
		scope = "global"
	}
	b, err := s.svc.Leaderboard(r.Context(), caller(r).UserID, q.Get("category"), scope)
	if err != nil {
		return err
	}
	return ok(w, b)
}

func (s *server) events(w http.ResponseWriter, r *http.Request) error {
	ev, err := s.svc.Events(r.Context(), caller(r).UserID)
	if err != nil {
		return err
	}
	return ok(w, ev)
}

func (s *server) eventLeaderboard(w http.ResponseWriter, r *http.Request) error {
	id, err := pathID(r)
	if err != nil {
		return err
	}
	b, err := s.svc.EventLeaderboard(r.Context(), caller(r).UserID, id)
	if err != nil {
		return err
	}
	return ok(w, b)
}

func (s *server) adminEvents(w http.ResponseWriter, r *http.Request) error {
	list, err := s.svc.AllEvents(r.Context())
	if err != nil {
		return err
	}
	return ok(w, list)
}

func (s *server) createEvent(w http.ResponseWriter, r *http.Request) error {
	var in game.EventInput
	if err := decode(r, &in); err != nil {
		return err
	}
	id, err := s.svc.CreateEvent(r.Context(), in)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusCreated, map[string]uuid.UUID{"id": id})
	return nil
}

func (s *server) updateEvent(w http.ResponseWriter, r *http.Request) error {
	id, err := pathID(r)
	if err != nil {
		return err
	}
	var in game.EventInput
	if err := decode(r, &in); err != nil {
		return err
	}
	if err := s.svc.UpdateEvent(r.Context(), id, in); err != nil {
		return err
	}
	return noContent(w)
}

func (s *server) deleteEvent(w http.ResponseWriter, r *http.Request) error {
	id, err := pathID(r)
	if err != nil {
		return err
	}
	if err := s.svc.DeleteEvent(r.Context(), id); err != nil {
		return err
	}
	return noContent(w)
}

func (s *server) adminAddXP(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Amount int `json:"amount"`
	}
	if err := decode(r, &in); err != nil {
		return err
	}
	xp, level, err := s.svc.AddXP(r.Context(), caller(r).UserID, in.Amount)
	if err != nil {
		return err
	}
	return ok(w, map[string]int{"xp": xp, "level": level})
}

func (s *server) adminGrantToken(w http.ResponseWriter, r *http.Request) error {
	var in service.GrantTokenInput
	if err := decode(r, &in); err != nil {
		return err
	}
	if err := s.svc.GrantToken(r.Context(), caller(r).UserID, in); err != nil {
		return err
	}
	return noContent(w)
}

func (s *server) adminUnlock(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		AchievementID string `json:"achievementId"`
	}
	if err := decode(r, &in); err != nil {
		return err
	}
	ids, err := s.svc.UnlockAchievement(r.Context(), caller(r).UserID, in.AchievementID)
	if err != nil {
		return err
	}
	return ok(w, unlocked{ids})
}
