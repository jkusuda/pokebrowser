package store

import (
	"context"

	"github.com/google/uuid"
)

type Ranked struct {
	UserID          uuid.UUID
	TrainerName     string
	AvatarID        string
	FriendCode      string
	IsPrivate       bool
	DisplayedBadges []string
	Value           int
	Rank            int
}

func (q *Q) queryRanked(ctx context.Context, sql string, args ...any) ([]Ranked, error) {
	rows, err := q.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []Ranked{}
	for rows.Next() {
		var r Ranked
		if err := rows.Scan(&r.UserID, &r.TrainerName, &r.AvatarID, &r.FriendCode, &r.IsPrivate,
			&r.DisplayedBadges, &r.Value, &r.Rank); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, rows.Err()
}

// Leaderboard ranks trainers by total catches or distinct sites. It returns
// everyone ranked within limit, plus me wherever I place. friendIDs, when not
// nil, restricts the board to me and my friends.
func (q *Q) Leaderboard(ctx context.Context, bySites bool, me uuid.UUID, friendIDs []uuid.UUID, limit int) ([]Ranked, error) {
	return q.queryRanked(ctx, `
		with scored as (
			select u.id, u.trainer_name, u.avatar_id, u.friend_code, u.is_private, u.displayed_badges,
				case when $1 then (select count(*)::int from public.user_sites x where x.user_id = u.id)
				     else coalesce(s.total_catches, 0) end as value
			from public.users u
			left join public.user_stats s on s.user_id = u.id
			where $3::uuid[] is null or u.id = $2 or u.id = any($3)
		), ranked as (
			select *, rank() over (order by value desc)::int as rnk from scored
		)
		select * from ranked where rnk <= $4 or id = $2 order by rnk, id`,
		bySites, me, friendIDs, limit)
}

// EventLeaderboard ranks an event's participants, returning the first limit
// rows plus me wherever I place.
func (q *Q) EventLeaderboard(ctx context.Context, eventID, me uuid.UUID, limit int) ([]Ranked, error) {
	return q.queryRanked(ctx, `
		with ranked as (
			select u.id, u.trainer_name, u.avatar_id, u.friend_code, u.is_private, u.displayed_badges,
				s.count as value, rank() over (order by s.count desc)::int as rnk,
				row_number() over (order by s.count desc, u.id) as pos
			from `+eventScores+` s
			join public.users u on u.id = s.user_id
			where s.count > 0
		)
		select id, trainer_name, avatar_id, friend_code, is_private, displayed_badges, value, rnk
		from ranked where pos <= $3 or id = $2 order by rnk, id`,
		eventID, me, limit)
}
