package service

import (
	"cmp"
	"context"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jkusuda/pokebrowser/services/api/internal/errs"
	"github.com/jkusuda/pokebrowser/services/api/internal/game"
	"github.com/jkusuda/pokebrowser/services/api/internal/store"
)

type Achievement struct {
	ID         string      `json:"id"`
	Reward     game.Reward `json:"reward"`
	Goal       int         `json:"goal"`
	Progress   int         `json:"progress"`
	UnlockedAt *time.Time  `json:"unlockedAt"`
	ClaimedAt  *time.Time  `json:"claimedAt"`
}

func (s *Service) Achievements(ctx context.Context, userID uuid.UUID) ([]Achievement, error) {
	q := s.store.Q()
	user, err := q.GetUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	p, _, err := s.progress(ctx, q, userID, game.Level(user.XP))
	if err != nil {
		return nil, err
	}
	if p[game.StatFriends], err = q.CountFriends(ctx, userID); err != nil {
		return nil, err
	}
	unlocks, err := q.ListUnlocks(ctx, userID)
	if err != nil {
		return nil, err
	}
	byID := map[string]store.Unlock{}
	for _, u := range unlocks {
		byID[u.AchievementID] = u
	}
	list := []Achievement{}
	for id, def := range game.Achievements {
		a := Achievement{ID: id, Reward: def.Reward, Goal: def.Goal}
		if u, ok := byID[id]; ok {
			a.UnlockedAt, a.ClaimedAt, a.Progress = &u.UnlockedAt, u.ClaimedAt, def.Goal
		} else if def.Stat != "" {
			a.Progress = min(p[def.Stat], def.Goal)
		}
		list = append(list, a)
	}
	slices.SortFunc(list, func(a, b Achievement) int { return cmp.Compare(a.ID, b.ID) })
	return list, nil
}

type ClaimResult struct {
	StorageGranted int        `json:"storageGranted"`
	TokenGranted   *string    `json:"tokenGranted"`
	TokenID        *uuid.UUID `json:"tokenId"`
	XPGranted      int        `json:"xpGranted"`
}

func (s *Service) ClaimAchievement(ctx context.Context, userID uuid.UUID, id string) (ClaimResult, error) {
	def, ok := game.Achievements[id]
	if !ok {
		return ClaimResult{}, errs.BadRequest("unknown_achievement", "Unknown achievement")
	}
	reward := def.Reward
	res := ClaimResult{StorageGranted: reward.Storage, XPGranted: reward.XP}
	if reward.Token != "" {
		res.TokenGranted = &reward.Token
	}
	err := s.store.Tx(ctx, func(q *store.Q) error {
		found, claimed, err := q.ClaimUnlock(ctx, userID, id)
		switch {
		case err != nil:
			return err
		case !found:
			return errs.NotFound("achievement_not_found", "Achievement not unlocked")
		case !claimed:
			return errs.Conflict("already_claimed", "Already claimed")
		}
		if _, err := s.addXP(ctx, q, userID, reward.XP, reward.Storage); err != nil {
			return err
		}
		if reward.Token != "" {
			tokenID, err := q.GrantToken(ctx, userID, store.NewToken{TokenType: reward.Token})
			if err != nil {
				return err
			}
			res.TokenID = &tokenID
		}
		return nil
	})
	return res, err
}

// OpenToken redeems a token for a Pokémon from its pool.
func (s *Service) OpenToken(ctx context.Context, userID, tokenID uuid.UUID) (CatchResult, error) {
	var res CatchResult
	err := s.store.Tx(ctx, func(q *store.Q) error {
		t, err := q.LockToken(ctx, userID, tokenID)
		if err != nil {
			return found(err, errs.NotFound("not_found", "Token not found"))
		}
		if t.UsedAt != nil {
			return errs.Conflict("already_used", "Token already used")
		}
		if t.TokenType == "type_pick" && t.TypeFilter == nil {
			return errs.Conflict("type_not_selected", "Choose a type first")
		}

		live, err := q.LiveEvents(ctx, s.now())
		if err != nil {
			return err
		}
		var typeFilter string
		var species int
		if t.TypeFilter != nil {
			typeFilter = *t.TypeFilter
		}
		if t.PokedexNumber != nil {
			species = *t.PokedexNumber
		}
		sp, shiny, ok := game.RollToken(s.rand, s.catalog, live, t.TokenType, typeFilter, species)
		if !ok {
			return errs.Conflict("empty_pool", "No Pokémon match this token")
		}
		if err := q.UseToken(ctx, t.ID); err != nil {
			return err
		}
		res, err = s.catch(ctx, q, userID, catch{species: sp, shiny: shiny, site: game.TokenCatchSite})
		return err
	})
	return res, err
}

func (s *Service) SetTokenType(ctx context.Context, userID, tokenID uuid.UUID, typeFilter string) error {
	typeFilter = strings.ToLower(typeFilter)
	if !game.IsType(typeFilter) {
		return errs.BadRequest("invalid_type", "Unknown type")
	}
	ok, err := s.store.Q().SetTokenType(ctx, userID, tokenID, typeFilter)
	if err == nil && !ok {
		return errs.NotFound("not_found", "Token not found")
	}
	return err
}

// ClaimCandy spends one banked level-up reward on candy for a caught species' family.
func (s *Service) ClaimCandy(ctx context.Context, userID uuid.UUID, pokedexNumber int) error {
	sp, ok := s.catalog.Get(pokedexNumber)
	if !ok {
		return errs.BadRequest("invalid_pokedex_number", "Unknown species")
	}
	return s.store.Tx(ctx, func(q *store.Q) error {
		caught, err := q.InPokedex(ctx, userID, sp.ID)
		if err != nil {
			return err
		}
		if !caught {
			return errs.BadRequest("species_not_unlocked", "Catch this species first")
		}
		took, err := q.TakeUnclaimedCandy(ctx, userID)
		if err != nil {
			return err
		}
		if !took {
			return errs.Conflict("no_pending_candy", "No level-up candy to claim")
		}
		return q.AddCandy(ctx, userID, sp.FamilyBaseID, game.LevelUpCandy)
	})
}
