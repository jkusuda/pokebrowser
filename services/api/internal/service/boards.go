package service

import (
	"context"
	"slices"
	"time"

	"github.com/google/uuid"
	"github.com/jkusuda/pokebrowser/services/api/internal/errs"
	"github.com/jkusuda/pokebrowser/services/api/internal/game"
	"github.com/jkusuda/pokebrowser/services/api/internal/store"
)

// Entry is one leaderboard row. Private trainers who aren't you or your
// friend appear with only their rank and value.
type Entry struct {
	Rank            int        `json:"rank"`
	Value           int        `json:"value"`
	IsPrivate       bool       `json:"isPrivate"`
	IsMe            bool       `json:"isMe"`
	ID              *uuid.UUID `json:"id"`
	TrainerName     *string    `json:"trainerName"`
	AvatarID        *string    `json:"avatarId"`
	FriendCode      *string    `json:"friendCode"`
	DisplayedBadges []string   `json:"displayedBadges"`
}

type Board struct {
	Top []Entry `json:"top"`
	Me  *Entry  `json:"me"`
}

func entry(r store.Ranked, me uuid.UUID, friends map[uuid.UUID]bool) Entry {
	e := Entry{Rank: r.Rank, Value: r.Value, IsPrivate: r.IsPrivate, IsMe: r.UserID == me}
	if !r.IsPrivate || e.IsMe || friends[r.UserID] {
		e.ID, e.TrainerName, e.AvatarID, e.FriendCode = &r.UserID, &r.TrainerName, &r.AvatarID, &r.FriendCode
		e.DisplayedBadges = nonNil(r.DisplayedBadges)
	}
	return e
}

func board(rows []store.Ranked, inTop func(i int, r store.Ranked) bool, me uuid.UUID, friends map[uuid.UUID]bool) Board {
	b := Board{Top: []Entry{}}
	for i, r := range rows {
		e := entry(r, me, friends)
		if inTop(i, r) {
			b.Top = append(b.Top, e)
		}
		if e.IsMe {
			b.Me = &e
		}
	}
	return b
}

func (s *Service) Leaderboard(ctx context.Context, userID uuid.UUID, category, scope string) (Board, error) {
	if category != "catches" && category != "sites" {
		return Board{}, errs.BadRequest("invalid_category", "category must be catches or sites")
	}
	if scope != "global" && scope != "friends" {
		return Board{}, errs.BadRequest("invalid_scope", "scope must be global or friends")
	}
	q := s.store.Q()
	friends, err := q.FriendIDs(ctx, userID)
	if err != nil {
		return Board{}, err
	}
	var only []uuid.UUID
	if scope == "friends" {
		only = []uuid.UUID{}
		for id := range friends {
			only = append(only, id)
		}
	}
	rows, err := q.Leaderboard(ctx, category == "sites", userID, only, game.LeaderboardSize)
	if err != nil {
		return Board{}, err
	}
	return board(rows, func(_ int, r store.Ranked) bool { return r.Rank <= game.LeaderboardSize }, userID, friends), nil
}

func (s *Service) EventLeaderboard(ctx context.Context, userID, eventID uuid.UUID) (Board, error) {
	q := s.store.Q()
	if _, err := q.GetEvent(ctx, eventID); err != nil {
		return Board{}, found(err, errs.NotFound("not_found", "Event not found"))
	}
	friends, err := q.FriendIDs(ctx, userID)
	if err != nil {
		return Board{}, err
	}
	rows, err := q.EventLeaderboard(ctx, eventID, userID, game.LeaderboardSize)
	if err != nil {
		return Board{}, err
	}
	return board(rows, func(i int, _ store.Ranked) bool { return i < game.LeaderboardSize }, userID, friends), nil
}

type Event struct {
	game.Event
	CommunityProgress *int `json:"communityProgress,omitempty"`
	MyProgress        *int `json:"myProgress,omitempty"`
}

type Events struct {
	ServerNow time.Time `json:"serverNow"`
	Live      []Event   `json:"live"`
	Upcoming  []Event   `json:"upcoming"`
	Past      []Event   `json:"past"`
}

// Events lists live events (with community and personal progress), the next
// 10 upcoming and the last 10 past.
func (s *Service) Events(ctx context.Context, userID uuid.UUID) (Events, error) {
	q := s.store.Q()
	now := s.now()
	live, err := q.LiveEvents(ctx, now)
	if err != nil {
		return Events{}, err
	}
	slices.SortStableFunc(live, func(a, b game.Event) int { return a.EndsAt.Compare(b.EndsAt) })
	game.SortLive(live)

	out := Events{ServerNow: now}
	if out.Live, err = withProgress(ctx, q, live); err != nil {
		return Events{}, err
	}
	for i := range out.Live {
		mine, err := q.EventScore(ctx, out.Live[i].ID, userID)
		if err != nil {
			return Events{}, err
		}
		out.Live[i].MyProgress = &mine
	}
	upcoming, err := q.UpcomingEvents(ctx, now, 10)
	if err != nil {
		return Events{}, err
	}
	if out.Upcoming, err = withProgress(ctx, q, upcoming); err != nil {
		return Events{}, err
	}
	past, err := q.PastEvents(ctx, now, 10)
	if err != nil {
		return Events{}, err
	}
	out.Past, err = withProgress(ctx, q, past)
	return out, err
}

// withProgress attaches community progress to events that have a goal.
func withProgress(ctx context.Context, q *store.Q, list []game.Event) ([]Event, error) {
	out := make([]Event, len(list))
	for i, e := range list {
		out[i] = Event{Event: e}
		if e.CommunityGoal != nil {
			total, err := q.CommunityProgress(ctx, e.ID)
			if err != nil {
				return nil, err
			}
			out[i].CommunityProgress = &total
		}
	}
	return out, nil
}
