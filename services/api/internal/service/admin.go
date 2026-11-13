package service

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/jkusuda/pokebrowser/services/api/internal/errs"
	"github.com/jkusuda/pokebrowser/services/api/internal/game"
	"github.com/jkusuda/pokebrowser/services/api/internal/store"
)

var errEventNotFound = errs.NotFound("not_found", "Event not found")

func (s *Service) IsAdmin(ctx context.Context, userID uuid.UUID) (bool, error) {
	u, err := s.store.Q().GetUser(ctx, userID)
	if err != nil {
		return false, found(err, errNoProfile)
	}
	return u.IsAdmin, nil
}

func (s *Service) AllEvents(ctx context.Context) ([]Event, error) {
	q := s.store.Q()
	list, err := q.AllEvents(ctx)
	if err != nil {
		return nil, err
	}
	return withProgress(ctx, q, list)
}

func (s *Service) CreateEvent(ctx context.Context, in game.EventInput) (uuid.UUID, error) {
	in.Normalize()
	if code := in.Validate(s.catalog); code != "" {
		return uuid.Nil, errs.BadRequest(code, "Invalid event")
	}
	return s.store.Q().CreateEvent(ctx, in)
}

// UpdateEvent edits an event. Once its community goal is reached, the scoring
// rule and reward are frozen; changing the scoring rule restarts the board.
func (s *Service) UpdateEvent(ctx context.Context, id uuid.UUID, in game.EventInput) error {
	in.Normalize()
	if code := in.Validate(s.catalog); code != "" {
		return errs.BadRequest(code, "Invalid event")
	}
	return s.store.Tx(ctx, func(q *store.Q) error {
		old, err := q.LockEvent(ctx, id)
		if err != nil {
			return found(err, errEventNotFound)
		}
		rescored := old.TrackedStat != in.TrackedStat || !equalPtr(old.TypeFilter, in.TypeFilter)
		if old.GoalReachedAt != nil && (rescored || !equalPtr(old.CommunityGoal, in.CommunityGoal) ||
			!equalPtr(old.RewardTokenType, in.RewardTokenType) || !equalPtr(old.RewardPokedex, in.RewardPokedex)) {
			return errs.Conflict("goal_already_reached", "Goal already reached: scoring and reward are locked")
		}
		if err := q.UpdateEvent(ctx, id, in); err != nil {
			return err
		}
		if rescored {
			if err := q.ResetEventProgress(ctx, id); err != nil {
				return err
			}
		}
		updated, err := q.GetEvent(ctx, id)
		if err != nil {
			return err
		}
		return s.completeGoalIfMet(ctx, q, updated)
	})
}

func (s *Service) DeleteEvent(ctx context.Context, id uuid.UUID) error {
	ok, err := s.store.Q().DeleteEvent(ctx, id)
	if err == nil && !ok {
		return errEventNotFound
	}
	return err
}

type GrantTokenInput struct {
	TokenType     string  `json:"tokenType"`
	TypeFilter    *string `json:"typeFilter"`
	PokedexNumber *int    `json:"pokedexNumber"`
}

func (s *Service) GrantToken(ctx context.Context, userID uuid.UUID, in GrantTokenInput) error {
	if in.TypeFilter != nil {
		t := strings.ToLower(*in.TypeFilter)
		in.TypeFilter = &t
	}
	if !game.IsTokenType(in.TokenType) {
		return errs.BadRequest("invalid_token_type", "Unknown token type")
	}
	if in.TypeFilter != nil && !game.IsType(*in.TypeFilter) {
		return errs.BadRequest("invalid_type", "Unknown type")
	}
	if (in.TokenType == "species") != (in.PokedexNumber != nil) {
		return errs.BadRequest("invalid_pokedex_number", "Species tokens need a Pokédex number, others must not have one")
	}
	if in.PokedexNumber != nil {
		if _, ok := s.catalog.Get(*in.PokedexNumber); !ok {
			return errs.BadRequest("invalid_pokedex_number", "Unknown species")
		}
	}
	_, err := s.store.Q().GrantToken(ctx, userID, store.NewToken{TokenType: in.TokenType, TypeFilter: in.TypeFilter, PokedexNumber: in.PokedexNumber})
	return err
}

func (s *Service) AddXP(ctx context.Context, userID uuid.UUID, amount int) (xp, level int, err error) {
	if amount < 1 || amount > 1_000_000 {
		return 0, 0, errs.BadRequest("invalid_amount", "Amount must be 1–1,000,000")
	}
	err = s.store.Tx(ctx, func(q *store.Q) error {
		xp, err = s.addXP(ctx, q, userID, amount, 0)
		return err
	})
	return xp, game.Level(xp), err
}

func (s *Service) UnlockAchievement(ctx context.Context, userID uuid.UUID, id string) ([]string, error) {
	if _, ok := game.Achievements[id]; !ok {
		return nil, errs.BadRequest("unknown_achievement", "Unknown achievement")
	}
	return s.store.Q().Unlock(ctx, userID, id)
}

func equalPtr[T comparable](a, b *T) bool {
	return (a == nil && b == nil) || (a != nil && b != nil && *a == *b)
}
