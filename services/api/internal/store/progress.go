package store

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type DexEntry struct {
	PokedexNumber int
	UnlockedAt    time.Time
}

func (q *Q) ListPokedex(ctx context.Context, userID uuid.UUID) ([]DexEntry, error) {
	rows, err := q.db.Query(ctx, `
		select pokedex_number, unlocked_at from public.pokedex
		where user_id = $1 order by pokedex_number`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []DexEntry{}
	for rows.Next() {
		var d DexEntry
		if err := rows.Scan(&d.PokedexNumber, &d.UnlockedAt); err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, rows.Err()
}

// AddToPokedex reports whether the species is new to the trainer.
func (q *Q) AddToPokedex(ctx context.Context, userID uuid.UUID, pokedexNumber int) (bool, error) {
	tag, err := q.db.Exec(ctx, `
		insert into public.pokedex (user_id, pokedex_number) values ($1, $2)
		on conflict do nothing`, userID, pokedexNumber)
	return tag.RowsAffected() == 1, err
}

func (q *Q) InPokedex(ctx context.Context, userID uuid.UUID, pokedexNumber int) (bool, error) {
	var ok bool
	err := q.db.QueryRow(ctx, `
		select exists (select 1 from public.pokedex where user_id = $1 and pokedex_number = $2)`,
		userID, pokedexNumber).Scan(&ok)
	return ok, err
}

func (q *Q) ShinyDexCount(ctx context.Context, userID uuid.UUID, maxPokedex int) (int, error) {
	var n int
	err := q.db.QueryRow(ctx, `
		select count(distinct pokedex_number) from public.pokemon
		where user_id = $1 and is_shiny and pokedex_number <= $2`, userID, maxPokedex).Scan(&n)
	return n, err
}

type Candy struct {
	FamilyBaseID int
	Count        int
}

func (q *Q) ListCandies(ctx context.Context, userID uuid.UUID) ([]Candy, error) {
	rows, err := q.db.Query(ctx, `
		select family_base_id, count from public.candies
		where user_id = $1 order by family_base_id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []Candy{}
	for rows.Next() {
		var c Candy
		if err := rows.Scan(&c.FamilyBaseID, &c.Count); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, rows.Err()
}

func (q *Q) AddCandy(ctx context.Context, userID uuid.UUID, family, n int) error {
	_, err := q.db.Exec(ctx, `
		insert into public.candies (user_id, family_base_id, count) values ($1, $2, $3)
		on conflict (user_id, family_base_id) do update set count = candies.count + excluded.count`,
		userID, family, n)
	return err
}

// SpendCandy reports false if the trainer has fewer than n candies of the family.
func (q *Q) SpendCandy(ctx context.Context, userID uuid.UUID, family, n int) (bool, error) {
	tag, err := q.db.Exec(ctx, `
		update public.candies set count = count - $3
		where user_id = $1 and family_base_id = $2 and count >= $3`, userID, family, n)
	return tag.RowsAffected() == 1, err
}

type Limits struct {
	LastRollAt       *time.Time
	LastCatchAt      *time.Time
	CatchesToday     int
	CatchesTodayDate *time.Time
}

// LockLimits locks the trainer's pacing row, serializing their rolls and catches.
func (q *Q) LockLimits(ctx context.Context, userID uuid.UUID) (Limits, error) {
	var l Limits
	err := q.db.QueryRow(ctx, `
		select last_roll_at, last_catch_at, catches_today, catches_today_date
		from public.user_limits where user_id = $1 for update`, userID,
	).Scan(&l.LastRollAt, &l.LastCatchAt, &l.CatchesToday, &l.CatchesTodayDate)
	return l, notFound(err)
}

func (q *Q) SetLastRoll(ctx context.Context, userID uuid.UUID, at time.Time) error {
	_, err := q.db.Exec(ctx, `update public.user_limits set last_roll_at = $2 where user_id = $1`, userID, at)
	return err
}

func (q *Q) RecordCatchTime(ctx context.Context, userID uuid.UUID, at time.Time, catchesToday int) error {
	_, err := q.db.Exec(ctx, `
		update public.user_limits
		set last_catch_at = $2, catches_today = $3, catches_today_date = $4
		where user_id = $1`, userID, at, catchesToday, at.UTC().Format(time.DateOnly))
	return err
}

type Encounter struct {
	Nonce         uuid.UUID
	PokedexNumber int
	IsShiny       bool
	CreatedAt     time.Time
}

func (q *Q) LockEncounter(ctx context.Context, userID uuid.UUID) (Encounter, error) {
	var e Encounter
	err := q.db.QueryRow(ctx, `
		select nonce, pokedex_number, is_shiny, created_at
		from public.pending_encounters where user_id = $1 for update`, userID,
	).Scan(&e.Nonce, &e.PokedexNumber, &e.IsShiny, &e.CreatedAt)
	return e, notFound(err)
}

func (q *Q) SaveEncounter(ctx context.Context, userID uuid.UUID, e Encounter) error {
	_, err := q.db.Exec(ctx, `
		insert into public.pending_encounters (user_id, nonce, pokedex_number, is_shiny, created_at)
		values ($1, $2, $3, $4, $5)
		on conflict (user_id) do update set nonce = excluded.nonce, pokedex_number = excluded.pokedex_number,
			is_shiny = excluded.is_shiny, created_at = excluded.created_at`,
		userID, e.Nonce, e.PokedexNumber, e.IsShiny, e.CreatedAt)
	return err
}

func (q *Q) DeleteEncounter(ctx context.Context, userID uuid.UUID) error {
	_, err := q.db.Exec(ctx, `delete from public.pending_encounters where user_id = $1`, userID)
	return err
}

type Stats struct {
	TotalCatches  int
	TotalReleases int
	LongestStreak int
	Sites         []string
	ActiveDays    []time.Time
}

func (q *Q) GetStats(ctx context.Context, userID uuid.UUID) (Stats, error) {
	s := Stats{Sites: []string{}, ActiveDays: []time.Time{}}
	err := q.db.QueryRow(ctx, `
		select total_catches, total_releases, longest_streak,
			coalesce((select array_agg(hostname order by hostname) from public.user_sites where user_id = $1), '{}'),
			coalesce((select array_agg(day order by day) from public.user_active_days where user_id = $1), '{}')
		from public.user_stats where user_id = $1`, userID,
	).Scan(&s.TotalCatches, &s.TotalReleases, &s.LongestStreak, &s.Sites, &s.ActiveDays)
	return s, notFound(err)
}

// RecordCatchStats bumps the catch counter and records the site and day.
func (q *Q) RecordCatchStats(ctx context.Context, userID uuid.UUID, site string, day time.Time) error {
	_, err := q.db.Exec(ctx, `
		with stats as (
			update public.user_stats set total_catches = total_catches + 1, updated_at = now() where user_id = $1
		), site as (
			insert into public.user_sites (user_id, hostname) select $1, $2 where $2 <> '' on conflict do nothing
		)
		insert into public.user_active_days (user_id, day) values ($1, $3) on conflict do nothing`,
		userID, site, day.Format(time.DateOnly))
	return err
}

func (q *Q) SetLongestStreak(ctx context.Context, userID uuid.UUID, n int) error {
	_, err := q.db.Exec(ctx, `
		update public.user_stats set longest_streak = greatest(longest_streak, $2) where user_id = $1`, userID, n)
	return err
}

func (q *Q) RecordRelease(ctx context.Context, userID uuid.UUID) error {
	_, err := q.db.Exec(ctx, `
		update public.user_stats set total_releases = total_releases + 1, updated_at = now() where user_id = $1`, userID)
	return err
}

type Unlock struct {
	AchievementID string
	UnlockedAt    time.Time
	ClaimedAt     *time.Time
}

func (q *Q) ListUnlocks(ctx context.Context, userID uuid.UUID) ([]Unlock, error) {
	rows, err := q.db.Query(ctx, `
		select achievement_id, unlocked_at, claimed_at from public.achievement_unlocks
		where user_id = $1 order by unlocked_at desc, achievement_id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []Unlock{}
	for rows.Next() {
		var u Unlock
		if err := rows.Scan(&u.AchievementID, &u.UnlockedAt, &u.ClaimedAt); err != nil {
			return nil, err
		}
		list = append(list, u)
	}
	return list, rows.Err()
}

// Unlock records achievements and returns the ones that weren't already unlocked.
func (q *Q) Unlock(ctx context.Context, userID uuid.UUID, ids ...string) ([]string, error) {
	rows, err := q.db.Query(ctx, `
		insert into public.achievement_unlocks (user_id, achievement_id)
		select $1, a from unnest($2::text[]) a order by a
		on conflict do nothing
		returning achievement_id`, userID, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	unlocked := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		unlocked = append(unlocked, id)
	}
	return unlocked, rows.Err()
}

func (q *Q) UnlockForUsers(ctx context.Context, userIDs []uuid.UUID, achievementID string) error {
	_, err := q.db.Exec(ctx, `
		insert into public.achievement_unlocks (user_id, achievement_id)
		select u, $2 from unnest($1::uuid[]) u order by u on conflict do nothing`, userIDs, achievementID)
	return err
}

// ClaimUnlock marks an unlocked achievement claimed. found is false if it was
// never unlocked; claimed is false if it was already claimed.
func (q *Q) ClaimUnlock(ctx context.Context, userID uuid.UUID, id string) (found, claimed bool, err error) {
	err = q.db.QueryRow(ctx, `
		with claim as (
			update public.achievement_unlocks set claimed_at = now()
			where user_id = $1 and achievement_id = $2 and claimed_at is null
			returning 1
		)
		select exists (select 1 from public.achievement_unlocks where user_id = $1 and achievement_id = $2),
			exists (select 1 from claim)`, userID, id).Scan(&found, &claimed)
	return found, claimed, err
}

func (q *Q) UnlockedAll(ctx context.Context, userID uuid.UUID, ids []string) (bool, error) {
	var n int
	err := q.db.QueryRow(ctx, `
		select count(*) from public.achievement_unlocks
		where user_id = $1 and achievement_id = any($2)`, userID, ids).Scan(&n)
	return n == len(ids), err
}

type Token struct {
	ID            uuid.UUID
	TokenType     string
	TypeFilter    *string
	PokedexNumber *int
	EventID       *uuid.UUID
	CreatedAt     time.Time
	UsedAt        *time.Time
}

const tokenColumns = `id, token_type, type_filter::text, pokedex_number, event_id, created_at, used_at`

func scanToken(row interface{ Scan(...any) error }) (Token, error) {
	var t Token
	err := row.Scan(&t.ID, &t.TokenType, &t.TypeFilter, &t.PokedexNumber, &t.EventID, &t.CreatedAt, &t.UsedAt)
	return t, notFound(err)
}

func (q *Q) ListUnusedTokens(ctx context.Context, userID uuid.UUID) ([]Token, error) {
	rows, err := q.db.Query(ctx, `
		select `+tokenColumns+` from public.tokens
		where user_id = $1 and used_at is null order by created_at, id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []Token{}
	for rows.Next() {
		t, err := scanToken(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, rows.Err()
}

func (q *Q) LockToken(ctx context.Context, userID, id uuid.UUID) (Token, error) {
	return scanToken(q.db.QueryRow(ctx, `
		select `+tokenColumns+` from public.tokens where id = $1 and user_id = $2 for update`, id, userID))
}

type NewToken struct {
	TokenType     string
	TypeFilter    *string
	PokedexNumber *int
	EventID       *uuid.UUID
}

func (q *Q) GrantToken(ctx context.Context, userID uuid.UUID, t NewToken) (uuid.UUID, error) {
	var id uuid.UUID
	err := q.db.QueryRow(ctx, `
		insert into public.tokens (user_id, token_type, type_filter, pokedex_number, event_id)
		values ($1, $2, $3::pokemon_type, $4, $5)
		returning id`, userID, t.TokenType, t.TypeFilter, t.PokedexNumber, t.EventID).Scan(&id)
	return id, err
}

// GrantEventTokens gives each user the event's reward token, at most once per event.
func (q *Q) GrantEventTokens(ctx context.Context, userIDs []uuid.UUID, eventID uuid.UUID, t NewToken) error {
	_, err := q.db.Exec(ctx, `
		insert into public.tokens (user_id, token_type, pokedex_number, event_id)
		select u, $2, $3, $4 from unnest($1::uuid[]) u order by u
		on conflict (user_id, event_id) where event_id is not null do nothing`,
		userIDs, t.TokenType, t.PokedexNumber, eventID)
	return err
}

func (q *Q) SetTokenType(ctx context.Context, userID, id uuid.UUID, typeFilter string) (bool, error) {
	tag, err := q.db.Exec(ctx, `
		update public.tokens set type_filter = $3::pokemon_type
		where id = $1 and user_id = $2 and used_at is null`, id, userID, typeFilter)
	return tag.RowsAffected() == 1, err
}

func (q *Q) UseToken(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, `update public.tokens set used_at = now() where id = $1`, id)
	return err
}
