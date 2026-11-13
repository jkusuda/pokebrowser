package service

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jkusuda/pokebrowser/services/api/internal/auth"
	"github.com/jkusuda/pokebrowser/services/api/internal/errs"
	"github.com/jkusuda/pokebrowser/services/api/internal/game"
	"github.com/jkusuda/pokebrowser/services/api/internal/store"
)

type Profile struct {
	ID          uuid.UUID `json:"id"`
	Email       string    `json:"email"`
	TrainerName string    `json:"trainerName"`
	AvatarID    string    `json:"avatarId"`
	FriendCode  string    `json:"friendCode"`
	LevelProgress
	CatchLimit           int        `json:"catchLimit"`
	UnclaimedCandyLevels int        `json:"unclaimedCandyLevels"`
	FavoritePokemonID    *uuid.UUID `json:"favoritePokemonId"`
	DisplayedBadges      []string   `json:"displayedBadges"`
	IsPrivate            bool       `json:"isPrivate"`
	IsAdmin              bool       `json:"isAdmin"`
	CreatedAt            time.Time  `json:"createdAt"`
}

type Settings struct {
	Theme                      string   `json:"theme"`
	SoundEnabled               bool     `json:"soundEnabled"`
	EncounterAnimationsEnabled bool     `json:"encounterAnimationsEnabled"`
	BlockedSites               []string `json:"blockedSites"`
	HasSeenTutorial            bool     `json:"hasSeenTutorial"`
}

type Stats struct {
	TotalCatches  int      `json:"totalCatches"`
	TotalReleases int      `json:"totalReleases"`
	CurrentStreak int      `json:"currentStreak"`
	LongestStreak int      `json:"longestStreak"`
	ActiveDays    []string `json:"activeDays"`
	Sites         []string `json:"sites"`
	TypesCaught   []string `json:"typesCaught"`
}

type DexEntry struct {
	PokedexNumber int       `json:"pokedexNumber"`
	UnlockedAt    time.Time `json:"unlockedAt"`
}

type Candy struct {
	FamilyBaseID int `json:"familyBaseId"`
	Count        int `json:"count"`
}

type Unlock struct {
	AchievementID string     `json:"achievementId"`
	UnlockedAt    time.Time  `json:"unlockedAt"`
	ClaimedAt     *time.Time `json:"claimedAt"`
}

type Token struct {
	ID            uuid.UUID  `json:"id"`
	TokenType     string     `json:"tokenType"`
	TypeFilter    *string    `json:"typeFilter"`
	PokedexNumber *int       `json:"pokedexNumber"`
	EventID       *uuid.UUID `json:"eventId"`
	CreatedAt     time.Time  `json:"createdAt"`
}

// LevelProgress is flattened into Profile and Trainer so clients can draw the
// XP bar without knowing the level curve.
type LevelProgress struct {
	Level       int `json:"level"`
	XP          int `json:"xp"`
	LevelXP     int `json:"levelXp"`
	NextLevelXP int `json:"nextLevelXp"`
}

func levelProgress(xp int) LevelProgress {
	n := game.Level(xp)
	return LevelProgress{n, xp, game.XPForLevel(n), game.XPForLevel(n + 1)}
}

type Trainer struct {
	ID          uuid.UUID `json:"id"`
	TrainerName string    `json:"trainerName"`
	AvatarID    string    `json:"avatarId"`
	FriendCode  string    `json:"friendCode"`
	LevelProgress
	FavoritePokemonID *uuid.UUID `json:"favoritePokemonId"`
	DisplayedBadges   []string   `json:"displayedBadges"`
}

type Friend struct {
	FriendshipID uuid.UUID `json:"friendshipId"`
	Since        time.Time `json:"since"`
	Trainer      Trainer   `json:"trainer"`
}

type Friends struct {
	Accepted []Friend `json:"accepted"`
	Incoming []Friend `json:"incoming"`
	Outgoing []Friend `json:"outgoing"`
}

type Me struct {
	Profile      Profile       `json:"profile"`
	Settings     Settings      `json:"settings"`
	Stats        Stats         `json:"stats"`
	Buddy        *PokemonView  `json:"buddy"`
	Pokemon      []PokemonView `json:"pokemon"`
	Pokedex      []DexEntry    `json:"pokedex"`
	Candies      []Candy       `json:"candies"`
	Achievements []Unlock      `json:"achievements"`
	Tokens       []Token       `json:"tokens"`
	Friends      Friends       `json:"friends"`
}

func profileOf(u store.User, email string) Profile {
	return Profile{u.ID, email, u.TrainerName, u.AvatarID, u.FriendCode, levelProgress(u.XP), u.CatchLimit,
		u.UnclaimedCandyLevels, u.FavoritePokemonID, nonNil(u.DisplayedBadges), u.IsPrivate, u.IsAdmin, u.CreatedAt}
}

func trainerOf(u store.User) Trainer {
	return Trainer{u.ID, u.TrainerName, u.AvatarID, u.FriendCode, levelProgress(u.XP), u.FavoritePokemonID, nonNil(u.DisplayedBadges)}
}

func (s *Service) settings(ctx context.Context, q *store.Q, userID uuid.UUID) (Settings, error) {
	st, err := q.GetSettings(ctx, userID)
	if err != nil {
		return Settings{}, found(err, errNoProfile)
	}
	return Settings{st.Theme, st.SoundEnabled, st.EncounterAnimationsEnabled, nonNil(st.BlockedSites), st.HasSeenTutorial}, nil
}

// Me returns everything the profile page shows.
func (s *Service) Me(ctx context.Context, id auth.Identity) (Me, error) {
	q := s.store.Q()
	u, err := q.GetUser(ctx, id.UserID)
	if err != nil {
		return Me{}, found(err, errNoProfile)
	}
	me := Me{Profile: profileOf(u, id.Email)}
	if me.Settings, err = s.settings(ctx, q, u.ID); err != nil {
		return Me{}, err
	}

	pokemon, err := q.ListPokemon(ctx, u.ID, 0)
	if err != nil {
		return Me{}, err
	}
	me.Pokemon = pokemonViews(pokemon)
	for _, p := range me.Pokemon {
		if u.FavoritePokemonID != nil && p.ID == *u.FavoritePokemonID {
			me.Buddy = &p
		}
	}

	dex, err := q.ListPokedex(ctx, u.ID)
	if err != nil {
		return Me{}, err
	}
	for _, d := range dex {
		me.Pokedex = append(me.Pokedex, DexEntry(d))
	}
	me.Pokedex = nonNil(me.Pokedex)

	stats, err := q.GetStats(ctx, u.ID)
	if err != nil {
		return Me{}, err
	}
	current, longest := game.Streaks(stats.ActiveDays)
	me.Stats = Stats{
		TotalCatches:  stats.TotalCatches,
		TotalReleases: stats.TotalReleases,
		CurrentStreak: current,
		LongestStreak: max(longest, stats.LongestStreak),
		ActiveDays:    []string{},
		Sites:         stats.Sites,
		TypesCaught:   s.typesCaught(dex),
	}
	for _, d := range stats.ActiveDays {
		me.Stats.ActiveDays = append(me.Stats.ActiveDays, d.Format(time.DateOnly))
	}

	candies, err := q.ListCandies(ctx, u.ID)
	if err != nil {
		return Me{}, err
	}
	me.Candies = []Candy{}
	for _, c := range candies {
		me.Candies = append(me.Candies, Candy(c))
	}

	unlocks, err := q.ListUnlocks(ctx, u.ID)
	if err != nil {
		return Me{}, err
	}
	me.Achievements = []Unlock{}
	for _, a := range unlocks {
		me.Achievements = append(me.Achievements, Unlock(a))
	}

	tokens, err := q.ListUnusedTokens(ctx, u.ID)
	if err != nil {
		return Me{}, err
	}
	me.Tokens = []Token{}
	for _, t := range tokens {
		me.Tokens = append(me.Tokens, Token{t.ID, t.TokenType, t.TypeFilter, t.PokedexNumber, t.EventID, t.CreatedAt})
	}

	me.Friends, err = s.friends(ctx, q, u.ID)
	return me, err
}

func (s *Service) friends(ctx context.Context, q *store.Q, userID uuid.UUID) (Friends, error) {
	ships, err := q.ListFriendships(ctx, userID)
	if err != nil {
		return Friends{}, err
	}
	ids := make([]uuid.UUID, len(ships))
	for i, f := range ships {
		ids[i] = f.Other(userID)
	}
	users, err := q.GetUsers(ctx, ids)
	if err != nil {
		return Friends{}, err
	}
	byID := map[uuid.UUID]store.User{}
	for _, u := range users {
		byID[u.ID] = u
	}

	out := Friends{Accepted: []Friend{}, Incoming: []Friend{}, Outgoing: []Friend{}}
	for _, f := range ships {
		fr := Friend{f.ID, f.CreatedAt, trainerOf(byID[f.Other(userID)])}
		switch {
		case f.Status == "accepted":
			out.Accepted = append(out.Accepted, fr)
		case f.FriendID == userID:
			out.Incoming = append(out.Incoming, fr)
		default:
			out.Outgoing = append(out.Outgoing, fr)
		}
	}
	return out, nil
}

type ProfileInput struct {
	TrainerName       *string             `json:"trainerName"`
	AvatarID          *string             `json:"avatarId"`
	IsPrivate         *bool               `json:"isPrivate"`
	FavoritePokemonID Nullable[uuid.UUID] `json:"favoritePokemonId"`
}

// UpdateProfile edits the trainer profile and returns any achievements it unlocked.
func (s *Service) UpdateProfile(ctx context.Context, userID uuid.UUID, in ProfileInput) ([]string, error) {
	var unlocked []string
	err := s.store.Tx(ctx, func(q *store.Q) error {
		u, err := q.GetUser(ctx, userID)
		if err != nil {
			return found(err, errNoProfile)
		}
		patch := store.ProfilePatch{IsPrivate: in.IsPrivate}
		var earned []string

		if in.TrainerName != nil {
			name := strings.TrimSpace(*in.TrainerName)
			if n := len([]rune(name)); n < 1 || n > 24 {
				return errs.BadRequest("invalid_trainer_name", "Trainer name must be 1–24 characters")
			}
			patch.TrainerName = &name
			if name != u.TrainerName {
				earned = append(earned, "identity_crisis")
			}
		}
		if in.AvatarID != nil {
			if n := len(*in.AvatarID); n < 1 || n > 8 {
				return errs.BadRequest("invalid_avatar", "Invalid avatar")
			}
			patch.AvatarID = in.AvatarID
			if *in.AvatarID != u.AvatarID {
				earned = append(earned, "new_look")
			}
		}
		if in.FavoritePokemonID.Set {
			if id := in.FavoritePokemonID.Value; id == nil {
				patch.ClearFavorite = true
			} else {
				if _, err := q.GetOwnedPokemon(ctx, userID, *id); err != nil {
					return found(err, errs.NotFound("not_found", "Pokémon not found"))
				}
				patch.FavoritePokemonID = id
			}
		}

		if err := q.UpdateProfile(ctx, userID, patch); err != nil {
			return err
		}
		unlocked, err = q.Unlock(ctx, userID, earned...)
		return err
	})
	return unlocked, err
}

type SettingsInput struct {
	Theme                      *string  `json:"theme"`
	SoundEnabled               *bool    `json:"soundEnabled"`
	EncounterAnimationsEnabled *bool    `json:"encounterAnimationsEnabled"`
	BlockedSites               []string `json:"blockedSites"`
	HasSeenTutorial            *bool    `json:"hasSeenTutorial"`
}

func (s *Service) UpdateSettings(ctx context.Context, userID uuid.UUID, in SettingsInput) (Settings, error) {
	patch := store.SettingsPatch{
		Theme: in.Theme, SoundEnabled: in.SoundEnabled,
		EncounterAnimationsEnabled: in.EncounterAnimationsEnabled, HasSeenTutorial: in.HasSeenTutorial,
	}
	if in.Theme != nil && *in.Theme != "green" && *in.Theme != "blue" {
		return Settings{}, errs.BadRequest("invalid_theme", "Unknown theme")
	}
	if in.BlockedSites != nil {
		sites, ok := game.BlockedSites(in.BlockedSites)
		if !ok {
			return Settings{}, errs.BadRequest("invalid_blocked_sites", "Blocked sites must be up to 100 valid hostnames")
		}
		patch.BlockedSites = sites
	}
	q := s.store.Q()
	if err := q.UpdateSettings(ctx, userID, patch); err != nil {
		return Settings{}, err
	}
	return s.settings(ctx, q, userID)
}

// SetBadges chooses up to three unlocked achievements to show on the profile.
func (s *Service) SetBadges(ctx context.Context, userID uuid.UUID, ids []string) error {
	if ids == nil || len(ids) > game.MaxDisplayedBadges || game.HasDuplicates(ids) {
		return errs.BadRequest("invalid_badges", "Choose up to 3 different badges")
	}
	for _, id := range ids {
		if _, ok := game.Achievements[id]; !ok {
			return errs.BadRequest("invalid_badges", "Unknown badge")
		}
	}
	q := s.store.Q()
	ok, err := q.UnlockedAll(ctx, userID, ids)
	if err != nil {
		return err
	}
	if !ok {
		return errs.Forbidden("badge_not_unlocked", "Badge not unlocked")
	}
	return q.UpdateProfile(ctx, userID, store.ProfilePatch{DisplayedBadges: ids})
}
