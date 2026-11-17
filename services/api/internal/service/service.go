// Package service holds the API's use cases. Each one runs in a single
// transaction and combines store queries with the rules in package game.
package service

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"math/rand/v2"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jkusuda/pokebrowser/services/api/internal/errs"
	"github.com/jkusuda/pokebrowser/services/api/internal/game"
	"github.com/jkusuda/pokebrowser/services/api/internal/metrics"
	"github.com/jkusuda/pokebrowser/services/api/internal/store"
)

type Service struct {
	store   *store.Store
	catalog *game.Catalog
	rand    *rand.Rand
	now     func() time.Time
	log     *slog.Logger
	metrics *metrics.Metrics
}

func New(st *store.Store, catalog *game.Catalog, log *slog.Logger, m *metrics.Metrics) *Service {
	return &Service{
		store:   st,
		catalog: catalog,
		rand:    rand.New(&lockedSource{src: rand.NewPCG(rand.Uint64(), rand.Uint64())}),
		now:     time.Now,
		log:     log,
		metrics: m,
	}
}

func (s *Service) Ping(ctx context.Context) error { return s.store.Ping(ctx) }

type lockedSource struct {
	mu  sync.Mutex
	src rand.Source
}

func (l *lockedSource) Uint64() uint64 {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.src.Uint64()
}

// Nullable distinguishes a JSON field that is absent (Set false) from one set to null.
type Nullable[T any] struct {
	Set   bool
	Value *T
}

func (n *Nullable[T]) UnmarshalJSON(b []byte) error {
	n.Set = true
	if string(b) == "null" {
		return nil
	}
	n.Value = new(T)
	return json.Unmarshal(b, n.Value)
}

func found(err error, notFound *errs.Error) error {
	if errors.Is(err, store.ErrNotFound) {
		return notFound
	}
	return err
}

// addXP grants XP (and box storage) and banks a level-up candy for each level gained.
func (s *Service) addXP(ctx context.Context, q *store.Q, userID uuid.UUID, xp, storage int) (int, error) {
	before, after, err := q.AddXP(ctx, userID, xp, storage)
	if err != nil {
		return 0, err
	}
	if gained := game.Level(after) - game.Level(before); gained > 0 {
		if err := q.AddUnclaimedCandy(ctx, userID, gained); err != nil {
			return 0, err
		}
	}
	return after, nil
}

type PokemonView struct {
	ID            uuid.UUID `json:"id"`
	PokedexNumber int       `json:"pokedexNumber"`
	Nickname      *string   `json:"nickname"`
	IsShiny       bool      `json:"isShiny"`
	CaughtAt      time.Time `json:"caughtAt"`
	CaughtOn      *string   `json:"caughtOn"`
}

func pokemonView(p store.Pokemon) PokemonView {
	return PokemonView{p.ID, p.PokedexNumber, p.Nickname, p.IsShiny, p.CaughtAt, p.CaughtOn}
}

func pokemonViews(list []store.Pokemon) []PokemonView {
	views := make([]PokemonView, len(list))
	for i, p := range list {
		views[i] = pokemonView(p)
	}
	return views
}

func (s *Service) buddy(ctx context.Context, q *store.Q, id *uuid.UUID) (*PokemonView, error) {
	if id == nil {
		return nil, nil
	}
	p, err := q.GetPokemon(ctx, *id)
	if errors.Is(err, store.ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	v := pokemonView(p)
	return &v, nil
}

func nonNil[T any](s []T) []T {
	if s == nil {
		return []T{}
	}
	return s
}
