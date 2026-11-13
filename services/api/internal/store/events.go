package store

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jkusuda/pokebrowser/services/api/internal/game"
)

const eventColumns = `id, name, description, starts_at, ends_at, tracked_stat, type_filter::text,
	xp_multiplier, candy_multiplier, shiny_multiplier, spotlight_pokedex, spotlight_rate,
	boosted_types::text[], type_boost, boosted_generations, generation_boost,
	community_goal, goal_reached_at, reward_token_type, reward_pokedex, finalized_at, created_at`

// eventScores is each participant's score in event $1: a counter for most
// stats, or the number of distinct species for unique_species events.
const eventScores = `(
	select user_id, count from public.event_progress where event_id = $1
	union all
	select user_id, count(*)::int from public.event_species where event_id = $1 group by user_id
)`

func scanEvent(row interface{ Scan(...any) error }) (game.Event, error) {
	var e game.Event
	err := row.Scan(&e.ID, &e.Name, &e.Description, &e.StartsAt, &e.EndsAt, &e.TrackedStat, &e.TypeFilter,
		&e.XPMultiplier, &e.CandyMultiplier, &e.ShinyMultiplier, &e.SpotlightPokedex, &e.SpotlightRate,
		&e.BoostedTypes, &e.TypeBoost, &e.BoostedGenerations, &e.GenerationBoost,
		&e.CommunityGoal, &e.GoalReachedAt, &e.RewardTokenType, &e.RewardPokedex, &e.FinalizedAt, &e.CreatedAt)
	return e, notFound(err)
}

func (q *Q) queryEvents(ctx context.Context, sql string, args ...any) ([]game.Event, error) {
	rows, err := q.db.Query(ctx, `select `+eventColumns+` from public.events `+sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []game.Event{}
	for rows.Next() {
		e, err := scanEvent(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}

func (q *Q) AllEvents(ctx context.Context) ([]game.Event, error) {
	return q.queryEvents(ctx, `order by starts_at desc`)
}

// LiveEvents returns events running at t, in id order (the order rows get locked in).
func (q *Q) LiveEvents(ctx context.Context, t time.Time) ([]game.Event, error) {
	return q.queryEvents(ctx, `where starts_at <= $1 and ends_at > $1 order by id`, t)
}

func (q *Q) UpcomingEvents(ctx context.Context, t time.Time, limit int) ([]game.Event, error) {
	return q.queryEvents(ctx, `where starts_at > $1 order by starts_at limit $2`, t, limit)
}

func (q *Q) PastEvents(ctx context.Context, t time.Time, limit int) ([]game.Event, error) {
	return q.queryEvents(ctx, `where ends_at <= $1 order by ends_at desc limit $2`, t, limit)
}

func (q *Q) GetEvent(ctx context.Context, id uuid.UUID) (game.Event, error) {
	return scanEvent(q.db.QueryRow(ctx, `select `+eventColumns+` from public.events where id = $1`, id))
}

func (q *Q) LockEvent(ctx context.Context, id uuid.UUID) (game.Event, error) {
	return scanEvent(q.db.QueryRow(ctx, `select `+eventColumns+` from public.events where id = $1 for update`, id))
}

func eventArgs(in game.EventInput) []any {
	return []any{in.Name, in.Description, in.StartsAt, in.EndsAt, in.TrackedStat, in.TypeFilter,
		in.XPMultiplier, in.CandyMultiplier, in.ShinyMultiplier, in.SpotlightPokedex, in.SpotlightRate,
		in.BoostedTypes, in.TypeBoost, in.BoostedGenerations, in.GenerationBoost,
		in.CommunityGoal, in.RewardTokenType, in.RewardPokedex}
}

func (q *Q) CreateEvent(ctx context.Context, in game.EventInput) (uuid.UUID, error) {
	var id uuid.UUID
	err := q.db.QueryRow(ctx, `
		insert into public.events (name, description, starts_at, ends_at, tracked_stat, type_filter,
			xp_multiplier, candy_multiplier, shiny_multiplier, spotlight_pokedex, spotlight_rate,
			boosted_types, type_boost, boosted_generations, generation_boost,
			community_goal, reward_token_type, reward_pokedex)
		values ($1, $2, $3, $4, $5, $6::pokemon_type, $7, $8, $9, $10, $11, $12::pokemon_type[], $13, $14, $15, $16, $17, $18)
		returning id`, eventArgs(in)...).Scan(&id)
	return id, err
}

func (q *Q) UpdateEvent(ctx context.Context, id uuid.UUID, in game.EventInput) error {
	_, err := q.db.Exec(ctx, `
		update public.events set name = $2, description = $3, starts_at = $4, ends_at = $5,
			tracked_stat = $6, type_filter = $7::pokemon_type, xp_multiplier = $8, candy_multiplier = $9,
			shiny_multiplier = $10, spotlight_pokedex = $11, spotlight_rate = $12,
			boosted_types = $13::pokemon_type[], type_boost = $14, boosted_generations = $15,
			generation_boost = $16, community_goal = $17, reward_token_type = $18, reward_pokedex = $19
		where id = $1`, append([]any{id}, eventArgs(in)...)...)
	return err
}

func (q *Q) DeleteEvent(ctx context.Context, id uuid.UUID) (bool, error) {
	tag, err := q.db.Exec(ctx, `delete from public.events where id = $1`, id)
	return tag.RowsAffected() == 1, err
}

func (q *Q) ResetEventProgress(ctx context.Context, eventID uuid.UUID) error {
	_, err := q.db.Exec(ctx, `
		with p as (delete from public.event_progress where event_id = $1)
		delete from public.event_species where event_id = $1`, eventID)
	return err
}

func (q *Q) IncrementEventProgress(ctx context.Context, eventID, userID uuid.UUID) error {
	_, err := q.db.Exec(ctx, `
		insert into public.event_progress (event_id, user_id, count) values ($1, $2, 1)
		on conflict (event_id, user_id) do update set count = event_progress.count + 1, updated_at = now()`,
		eventID, userID)
	return err
}

// AddEventSpecies reports whether the species is new for the trainer in this event.
func (q *Q) AddEventSpecies(ctx context.Context, eventID, userID uuid.UUID, pokedexNumber int) (bool, error) {
	tag, err := q.db.Exec(ctx, `
		insert into public.event_species (event_id, user_id, pokedex_number) values ($1, $2, $3)
		on conflict do nothing`, eventID, userID, pokedexNumber)
	return tag.RowsAffected() == 1, err
}

func (q *Q) CommunityProgress(ctx context.Context, eventID uuid.UUID) (int, error) {
	var n int
	err := q.db.QueryRow(ctx, `select coalesce(sum(count), 0)::int from `+eventScores+` s`, eventID).Scan(&n)
	return n, err
}

func (q *Q) EventParticipants(ctx context.Context, eventID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := q.db.Query(ctx, `select user_id from `+eventScores+` s where count > 0 order by user_id`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (q *Q) EventScore(ctx context.Context, eventID, userID uuid.UUID) (int, error) {
	var n int
	err := q.db.QueryRow(ctx, `
		select coalesce(sum(count), 0)::int from `+eventScores+` s where user_id = $2`, eventID, userID).Scan(&n)
	return n, err
}

func (q *Q) MarkGoalReached(ctx context.Context, eventID uuid.UUID, at time.Time) error {
	_, err := q.db.Exec(ctx, `update public.events set goal_reached_at = $2 where id = $1`, eventID, at)
	return err
}

// LockEndedEvents locks ended, unfinalized events, skipping ones another instance holds.
func (q *Q) LockEndedEvents(ctx context.Context, t time.Time) ([]uuid.UUID, error) {
	rows, err := q.db.Query(ctx, `
		select id from public.events where ends_at <= $1 and finalized_at is null
		order by ends_at for update skip locked`, t)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// TopRanked returns participants ranked within the top n (ties included).
func (q *Q) TopRanked(ctx context.Context, eventID uuid.UUID, n int) ([]uuid.UUID, error) {
	rows, err := q.db.Query(ctx, `
		select user_id from (
			select user_id, rank() over (order by count desc) as rnk from `+eventScores+` s where count > 0
		) r where rnk <= $2`, eventID, n)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (q *Q) MarkFinalized(ctx context.Context, eventID uuid.UUID, at time.Time) error {
	_, err := q.db.Exec(ctx, `update public.events set finalized_at = $2 where id = $1`, eventID, at)
	return err
}
