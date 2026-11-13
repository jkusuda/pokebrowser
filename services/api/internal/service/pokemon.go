package service

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/jkusuda/pokebrowser/services/api/internal/errs"
	"github.com/jkusuda/pokebrowser/services/api/internal/game"
	"github.com/jkusuda/pokebrowser/services/api/internal/store"
)

var errPokemonNotFound = errs.NotFound("not_found", "Pokémon not found")

func (s *Service) RecentPokemon(ctx context.Context, userID uuid.UUID, limit int) ([]PokemonView, error) {
	list, err := s.store.Q().ListPokemon(ctx, userID, limit)
	return pokemonViews(list), err
}

func (s *Service) Rename(ctx context.Context, userID, id uuid.UUID, nickname string) ([]string, error) {
	nickname = strings.TrimSpace(nickname)
	if n := len([]rune(nickname)); n < 1 || n > 12 {
		return nil, errs.BadRequest("invalid_nickname", "Nickname must be 1–12 characters")
	}
	var unlocked []string
	err := s.store.Tx(ctx, func(q *store.Q) error {
		p, err := q.GetOwnedPokemon(ctx, userID, id)
		if err != nil {
			return found(err, errPokemonNotFound)
		}
		if err := q.UpdatePokemon(ctx, id, p.PokedexNumber, &nickname); err != nil {
			return err
		}
		unlocked, err = q.Unlock(ctx, userID, "that_sounds_better")
		return err
	})
	return unlocked, err
}

func (s *Service) Release(ctx context.Context, userID, id uuid.UUID) ([]string, error) {
	var unlocked []string
	err := s.store.Tx(ctx, func(q *store.Q) error {
		if _, err := q.GetOwnedPokemon(ctx, userID, id); err != nil {
			return found(err, errPokemonNotFound)
		}
		if err := q.DeletePokemon(ctx, id); err != nil {
			return err
		}
		if err := q.RecordRelease(ctx, userID); err != nil {
			return err
		}
		var err error
		unlocked, err = q.Unlock(ctx, userID, "letting_go")
		return err
	})
	return unlocked, err
}

type EvolveResult struct {
	Pokemon      PokemonView `json:"pokemon"`
	IsNewSpecies bool        `json:"isNewSpecies"`
}

// Evolve spends the family's candy to evolve a Pokémon. target picks among
// branching evolutions; 0 takes the lowest-numbered one. A default nickname
// follows the new species.
func (s *Service) Evolve(ctx context.Context, userID, id uuid.UUID, target int) (EvolveResult, error) {
	var res EvolveResult
	err := s.store.Tx(ctx, func(q *store.Q) error {
		p, err := q.GetOwnedPokemon(ctx, userID, id)
		if err != nil {
			return found(err, errPokemonNotFound)
		}
		from, _ := s.catalog.Get(p.PokedexNumber)
		evo, ok := s.catalog.Evolution(from.ID, target)
		if !ok {
			return errs.BadRequest("not_evolvable", "This Pokémon can't evolve that way")
		}
		to, _ := s.catalog.Get(evo.To)

		paid, err := q.SpendCandy(ctx, userID, from.FamilyBaseID, evo.Cost)
		if err != nil {
			return err
		}
		if !paid {
			return errs.BadRequest("insufficient_candy", "Not enough candy")
		}

		nickname := p.Nickname
		if nickname != nil && *nickname == game.DisplayName(from.Name) {
			name := game.DisplayName(to.Name)
			nickname = &name
		}
		if err := q.UpdatePokemon(ctx, id, to.ID, nickname); err != nil {
			return err
		}
		isNew, err := q.AddToPokedex(ctx, userID, to.ID)
		if err != nil {
			return err
		}
		live, err := q.LiveEvents(ctx, s.now())
		if err != nil {
			return err
		}
		if err := s.scoreEvents(ctx, q, userID, live, true, to, false); err != nil {
			return err
		}
		p.PokedexNumber, p.Nickname = to.ID, nickname
		res = EvolveResult{pokemonView(p), isNew}
		return nil
	})
	return res, err
}
