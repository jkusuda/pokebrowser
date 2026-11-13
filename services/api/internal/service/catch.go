package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jkusuda/pokebrowser/services/api/internal/errs"
	"github.com/jkusuda/pokebrowser/services/api/internal/game"
	"github.com/jkusuda/pokebrowser/services/api/internal/store"
)

var (
	errNoEncounter = errs.Conflict("no_pending_encounter", "No encounter to catch")
	errExpired     = errs.Conflict("encounter_expired", "The Pokémon got away")
	errRateLimited = errs.TooMany("rate_limited", "Catching too fast")
	errDailyLimit  = errs.TooMany("daily_limit_reached", "Daily catch limit reached")
	errBoxFull     = errs.Conflict("catch_limit_reached", "Box is full")
	errNoProfile   = errs.NotFound("not_found", "Trainer profile not found")
)

type Encounter struct {
	Nonce         uuid.UUID `json:"nonce"`
	PokedexNumber int       `json:"pokedexNumber"`
	IsShiny       bool      `json:"isShiny"`
}

// Status is what the extension needs on every page: box space, settings and buddy.
type Status struct {
	BoxCount   int          `json:"boxCount"`
	CatchLimit int          `json:"catchLimit"`
	Settings   Settings     `json:"settings"`
	Buddy      *PokemonView `json:"buddy"`
}

type RollResult struct {
	Encounter    *Encounter `json:"encounter"`
	RetryAfterMs int64      `json:"retryAfterMs"`
	Status
}

// Roll offers a wild encounter. An unexpired encounter is returned again
// rather than rerolled, and both hits and misses start the roll cooldown, so
// asking more often never yields more encounters.
func (s *Service) Roll(ctx context.Context, userID uuid.UUID) (RollResult, error) {
	var res RollResult
	err := s.store.Tx(ctx, func(q *store.Q) error {
		now := s.now()
		enc, err := q.LockEncounter(ctx, userID)
		if err == nil && now.Sub(enc.CreatedAt) < game.EncounterTTL {
			res.Encounter = &Encounter{enc.Nonce, enc.PokedexNumber, enc.IsShiny}
			res.RetryAfterMs = game.RollCooldown.Milliseconds()
			return nil
		}
		if err != nil && !errors.Is(err, store.ErrNotFound) {
			return err
		}

		lim, err := q.LockLimits(ctx, userID)
		if err != nil {
			return found(err, errNoProfile)
		}
		if lim.LastRollAt != nil {
			if wait := lim.LastRollAt.Add(game.RollCooldown).Sub(now); wait > 0 {
				res.RetryAfterMs = int64(math.Ceil(float64(wait) / float64(time.Millisecond)))
				return nil
			}
		}
		if err := q.SetLastRoll(ctx, userID, now); err != nil {
			return err
		}
		res.RetryAfterMs = game.RollCooldown.Milliseconds()
		if s.rand.Float64() >= game.EncounterRate {
			return nil
		}

		live, err := q.LiveEvents(ctx, now)
		if err != nil {
			return err
		}
		e := store.Encounter{
			Nonce:         uuid.New(),
			PokedexNumber: game.RollWild(s.rand, s.catalog, live).ID,
			IsShiny:       s.rand.Float64() < game.ShinyChance(live),
			CreatedAt:     now,
		}
		if err := q.SaveEncounter(ctx, userID, e); err != nil {
			return err
		}
		res.Encounter = &Encounter{e.Nonce, e.PokedexNumber, e.IsShiny}
		res.RetryAfterMs = 0
		return nil
	})
	if err != nil {
		return RollResult{}, err
	}
	res.Status, err = s.Status(ctx, userID)
	return res, err
}

func (s *Service) Status(ctx context.Context, userID uuid.UUID) (Status, error) {
	q := s.store.Q()
	u, err := q.GetUser(ctx, userID)
	if err != nil {
		return Status{}, found(err, errNoProfile)
	}
	st := Status{CatchLimit: u.CatchLimit}
	if st.BoxCount, err = q.CountPokemon(ctx, userID); err != nil {
		return Status{}, err
	}
	if st.Settings, err = s.settings(ctx, q, userID); err != nil {
		return Status{}, err
	}
	st.Buddy, err = s.buddy(ctx, q, u.FavoritePokemonID)
	return st, err
}

type CatchResult struct {
	PokemonID       uuid.UUID `json:"pokemonId"`
	PokedexNumber   int       `json:"pokedexNumber"`
	IsShiny         bool      `json:"isShiny"`
	IsNewSpecies    bool      `json:"isNewSpecies"`
	NewAchievements []string  `json:"newAchievements"`
}

// Catch claims the pending encounter. Retrying a catch that already succeeded
// returns the same Pokémon.
func (s *Service) Catch(ctx context.Context, userID, nonce uuid.UUID, caughtOn string) (CatchResult, error) {
	var res CatchResult
	err := s.store.Tx(ctx, func(q *store.Q) error {
		enc, err := q.LockEncounter(ctx, userID)
		if errors.Is(err, store.ErrNotFound) || err == nil && enc.Nonce != nonce {
			p, err := q.PokemonByEncounter(ctx, userID, nonce)
			if err != nil {
				return found(err, errNoEncounter)
			}
			res = CatchResult{PokemonID: p.ID, PokedexNumber: p.PokedexNumber, IsShiny: p.IsShiny, NewAchievements: []string{}}
			return nil
		}
		if err != nil {
			return err
		}
		if s.now().Sub(enc.CreatedAt) >= game.EncounterTTL {
			return errExpired
		}
		if err := q.DeleteEncounter(ctx, userID); err != nil {
			return err
		}
		species, ok := s.catalog.Get(enc.PokedexNumber)
		if !ok {
			return fmt.Errorf("species %d not in catalog; restart to reload", enc.PokedexNumber)
		}
		res, err = s.catch(ctx, q, userID, catch{
			species: species, shiny: enc.IsShiny, site: game.CaughtOn(caughtOn),
			cooldown: true, encounterID: &enc.Nonce,
		})
		return err
	})
	return res, err
}

type catch struct {
	species     game.Species
	shiny       bool
	site        string
	cooldown    bool
	encounterID *uuid.UUID
}

// catch adds a Pokémon to the trainer's box along with everything a catch
// earns: Pokédex entry, candy, XP, stats, achievements and event progress.
func (s *Service) catch(ctx context.Context, q *store.Q, userID uuid.UUID, c catch) (CatchResult, error) {
	now := s.now()
	lim, err := q.LockLimits(ctx, userID)
	if err != nil {
		return CatchResult{}, found(err, errNoProfile)
	}
	if c.cooldown && lim.LastCatchAt != nil && now.Sub(*lim.LastCatchAt) < game.CatchCooldown {
		return CatchResult{}, errRateLimited
	}
	today := game.UTCDay(now)
	catchesToday := lim.CatchesToday
	if lim.CatchesTodayDate == nil || !lim.CatchesTodayDate.Equal(today) {
		catchesToday = 0
	}
	if catchesToday >= game.DailyCatchCap {
		return CatchResult{}, errDailyLimit
	}

	u, err := q.GetUser(ctx, userID)
	if err != nil {
		return CatchResult{}, err
	}
	count, err := q.CountPokemon(ctx, userID)
	if err != nil {
		return CatchResult{}, err
	}
	if count >= u.CatchLimit {
		return CatchResult{}, errBoxFull
	}

	live, err := q.LiveEvents(ctx, now)
	if err != nil {
		return CatchResult{}, err
	}
	isNew, err := q.AddToPokedex(ctx, userID, c.species.ID)
	if err != nil {
		return CatchResult{}, err
	}
	id, err := q.InsertPokemon(ctx, store.NewPokemon{
		UserID: userID, PokedexNumber: c.species.ID, Nickname: game.DisplayName(c.species.Name),
		IsShiny: c.shiny, CaughtOn: c.site, EncounterID: c.encounterID,
	})
	if err != nil {
		return CatchResult{}, err
	}
	candy := int(math.Round(game.CatchCandy * game.Multiplier(live, game.CandyMultiplier)))
	if err := q.AddCandy(ctx, userID, c.species.FamilyBaseID, candy); err != nil {
		return CatchResult{}, err
	}
	xp := int(math.Round(float64(s.catalog.CatchXP(c.species, c.shiny)) * game.Multiplier(live, game.XPMultiplier)))
	totalXP, err := s.addXP(ctx, q, userID, xp, 0)
	if err != nil {
		return CatchResult{}, err
	}
	if err := q.RecordCatchTime(ctx, userID, now, catchesToday+1); err != nil {
		return CatchResult{}, err
	}
	if err := q.RecordCatchStats(ctx, userID, c.site, today); err != nil {
		return CatchResult{}, err
	}
	unlocked, err := s.catchAchievements(ctx, q, userID, game.Level(totalXP), c)
	if err != nil {
		return CatchResult{}, err
	}
	if err := s.scoreEvents(ctx, q, userID, live, false, c.species, c.shiny); err != nil {
		return CatchResult{}, err
	}
	return CatchResult{id, c.species.ID, c.shiny, isNew, unlocked}, nil
}

func (s *Service) catchAchievements(ctx context.Context, q *store.Q, userID uuid.UUID, level int, c catch) ([]string, error) {
	p, longest, err := s.progress(ctx, q, userID, level)
	if err != nil {
		return nil, err
	}
	if err := q.SetLongestStreak(ctx, userID, longest); err != nil {
		return nil, err
	}
	return q.Unlock(ctx, userID, game.CatchAchievements(p, c.shiny, c.species.Legendary)...)
}

// progress loads the trainer's achievement stats, plus their longest streak.
func (s *Service) progress(ctx context.Context, q *store.Q, userID uuid.UUID, level int) (game.Progress, int, error) {
	stats, err := q.GetStats(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	dex, err := q.ListPokedex(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	shinyKanto, err := q.ShinyDexCount(ctx, userID, 151)
	if err != nil {
		return nil, 0, err
	}
	current, longest := game.Streaks(stats.ActiveDays)
	p := game.Progress{
		game.StatCatches:    stats.TotalCatches,
		game.StatSites:      len(stats.Sites),
		game.StatDex:        len(dex),
		game.StatShinyKanto: shinyKanto,
		game.StatTypes:      len(s.typesCaught(dex)),
		game.StatStreak:     current,
		game.StatLevel:      level,
	}
	for _, stat := range game.GenerationStat {
		p[stat] = 0
	}
	for _, d := range dex {
		sp, _ := s.catalog.Get(d.PokedexNumber)
		if stat, ok := game.GenerationStat[sp.Generation]; ok {
			p[stat]++
		}
	}
	return p, longest, nil
}

func (s *Service) typesCaught(dex []store.DexEntry) []string {
	seen := map[string]bool{}
	for _, d := range dex {
		sp, _ := s.catalog.Get(d.PokedexNumber)
		for _, t := range sp.Types {
			seen[t] = true
		}
	}
	var types []string
	for _, t := range game.Types {
		if seen[t] {
			types = append(types, t)
		}
	}
	return nonNil(types)
}

// scoreEvents records a catch or evolution against every live event it counts
// toward, completing community goals and granting their rewards.
func (s *Service) scoreEvents(ctx context.Context, q *store.Q, userID uuid.UUID, live []game.Event, evolve bool, sp game.Species, shiny bool) error {
	for _, e := range live {
		scored := false
		if e.TrackedStat == game.StatUniqueSpecies {
			if evolve {
				continue
			}
			var err error
			if scored, err = q.AddEventSpecies(ctx, e.ID, userID, sp.ID); err != nil {
				return err
			}
		} else if e.Scores(evolve, shiny, sp.Types) {
			if err := q.IncrementEventProgress(ctx, e.ID, userID); err != nil {
				return err
			}
			scored = true
		}
		if !scored || e.CommunityGoal == nil {
			continue
		}

		ev, err := q.LockEvent(ctx, e.ID)
		if err != nil {
			return err
		}
		if ev.GoalReachedAt != nil {
			err = grantEventReward(ctx, q, ev, []uuid.UUID{userID})
		} else {
			err = s.completeGoalIfMet(ctx, q, ev)
		}
		if err != nil {
			return err
		}
	}
	return nil
}

// completeGoalIfMet marks a locked event's community goal reached once its
// total progress meets the goal, rewarding everyone who contributed.
func (s *Service) completeGoalIfMet(ctx context.Context, q *store.Q, ev game.Event) error {
	if ev.CommunityGoal == nil || ev.GoalReachedAt != nil {
		return nil
	}
	progress, err := q.CommunityProgress(ctx, ev.ID)
	if err != nil || progress < *ev.CommunityGoal {
		return err
	}
	if err := q.MarkGoalReached(ctx, ev.ID, s.now()); err != nil {
		return err
	}
	users, err := q.EventParticipants(ctx, ev.ID)
	if err != nil {
		return err
	}
	return grantEventReward(ctx, q, ev, users)
}

func grantEventReward(ctx context.Context, q *store.Q, ev game.Event, users []uuid.UUID) error {
	if len(users) == 0 || ev.RewardTokenType == nil {
		return nil
	}
	err := q.GrantEventTokens(ctx, users, ev.ID, store.NewToken{TokenType: *ev.RewardTokenType, PokedexNumber: ev.RewardPokedex})
	if err != nil {
		return err
	}
	return q.UnlockForUsers(ctx, users, "team_player")
}
