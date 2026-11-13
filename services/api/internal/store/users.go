package store

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                   uuid.UUID
	TrainerName          string
	AvatarID             string
	FriendCode           string
	XP                   int
	CatchLimit           int
	UnclaimedCandyLevels int
	FavoritePokemonID    *uuid.UUID
	DisplayedBadges      []string
	IsPrivate            bool
	IsAdmin              bool
	CreatedAt            time.Time
}

const userColumns = `id, trainer_name, avatar_id, friend_code, xp, catch_limit, unclaimed_candy_levels,
	favorite_pokemon_id, displayed_badges, is_private, is_admin, created_at`

func scanUser(row interface{ Scan(...any) error }) (User, error) {
	var u User
	err := row.Scan(&u.ID, &u.TrainerName, &u.AvatarID, &u.FriendCode, &u.XP, &u.CatchLimit,
		&u.UnclaimedCandyLevels, &u.FavoritePokemonID, &u.DisplayedBadges, &u.IsPrivate, &u.IsAdmin, &u.CreatedAt)
	return u, notFound(err)
}

func (q *Q) GetUser(ctx context.Context, id uuid.UUID) (User, error) {
	return scanUser(q.db.QueryRow(ctx, `select `+userColumns+` from public.users where id = $1`, id))
}

func (q *Q) GetUserByFriendCode(ctx context.Context, code string) (User, error) {
	return scanUser(q.db.QueryRow(ctx, `select `+userColumns+` from public.users where friend_code = $1`, code))
}

func (q *Q) GetUsers(ctx context.Context, ids []uuid.UUID) ([]User, error) {
	rows, err := q.db.Query(ctx, `select `+userColumns+` from public.users where id = any($1)`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

type ProfilePatch struct {
	TrainerName       *string
	AvatarID          *string
	IsPrivate         *bool
	FavoritePokemonID *uuid.UUID
	ClearFavorite     bool
	DisplayedBadges   []string
}

func (q *Q) UpdateProfile(ctx context.Context, id uuid.UUID, p ProfilePatch) error {
	_, err := q.db.Exec(ctx, `
		update public.users set
			trainer_name = coalesce($2, trainer_name),
			avatar_id = coalesce($3, avatar_id),
			is_private = coalesce($4, is_private),
			favorite_pokemon_id = case when $6 then null else coalesce($5, favorite_pokemon_id) end,
			displayed_badges = coalesce($7, displayed_badges)
		where id = $1`,
		id, p.TrainerName, p.AvatarID, p.IsPrivate, p.FavoritePokemonID, p.ClearFavorite, p.DisplayedBadges)
	return err
}

// AddXP adds xp (and storage) and returns the XP before and after.
func (q *Q) AddXP(ctx context.Context, id uuid.UUID, xp, storage int) (before, after int, err error) {
	err = q.db.QueryRow(ctx, `
		update public.users set xp = xp + $2, catch_limit = catch_limit + $3
		where id = $1
		returning xp - $2, xp`, id, xp, storage).Scan(&before, &after)
	return before, after, notFound(err)
}

func (q *Q) AddUnclaimedCandy(ctx context.Context, id uuid.UUID, levels int) error {
	_, err := q.db.Exec(ctx, `
		update public.users set unclaimed_candy_levels = unclaimed_candy_levels + $2 where id = $1`, id, levels)
	return err
}

// TakeUnclaimedCandy uses up one pending level-up candy, reporting false if none were pending.
func (q *Q) TakeUnclaimedCandy(ctx context.Context, id uuid.UUID) (bool, error) {
	tag, err := q.db.Exec(ctx, `
		update public.users set unclaimed_candy_levels = unclaimed_candy_levels - 1
		where id = $1 and unclaimed_candy_levels > 0`, id)
	return tag.RowsAffected() == 1, err
}

type Settings struct {
	Theme                      string
	SoundEnabled               bool
	EncounterAnimationsEnabled bool
	BlockedSites               []string
	HasSeenTutorial            bool
}

type SettingsPatch struct {
	Theme                      *string
	SoundEnabled               *bool
	EncounterAnimationsEnabled *bool
	BlockedSites               []string
	HasSeenTutorial            *bool
}

func (q *Q) GetSettings(ctx context.Context, userID uuid.UUID) (Settings, error) {
	var s Settings
	err := q.db.QueryRow(ctx, `
		select theme, sound_enabled, encounter_animations_enabled, blocked_sites, has_seen_tutorial
		from public.user_settings where user_id = $1`, userID,
	).Scan(&s.Theme, &s.SoundEnabled, &s.EncounterAnimationsEnabled, &s.BlockedSites, &s.HasSeenTutorial)
	return s, notFound(err)
}

func (q *Q) UpdateSettings(ctx context.Context, userID uuid.UUID, p SettingsPatch) error {
	_, err := q.db.Exec(ctx, `
		update public.user_settings set
			theme = coalesce($2, theme),
			sound_enabled = coalesce($3, sound_enabled),
			encounter_animations_enabled = coalesce($4, encounter_animations_enabled),
			blocked_sites = coalesce($5, blocked_sites),
			has_seen_tutorial = coalesce($6, has_seen_tutorial)
		where user_id = $1`,
		userID, p.Theme, p.SoundEnabled, p.EncounterAnimationsEnabled, p.BlockedSites, p.HasSeenTutorial)
	return err
}
