package service

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/jkusuda/pokebrowser/services/api/internal/errs"
	"github.com/jkusuda/pokebrowser/services/api/internal/game"
	"github.com/jkusuda/pokebrowser/services/api/internal/store"
)

var (
	friendCodeRe       = regexp.MustCompile(`^[A-Z0-9]{4}-[A-Z0-9]{4}$`)
	errTrainerNotFound = errs.NotFound("not_found", "Trainer not found")
	errFriendNotFound  = errs.NotFound("not_found", "Friend request not found")
	errFriendLimit     = errs.TooMany("friend_limit", "Friend list is full")
	errAlreadyFriends  = errs.Conflict("already_friends", "You're already friends or have a pending request")
)

func normalizeCode(code string) (string, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if !friendCodeRe.MatchString(code) {
		return "", errs.BadRequest("invalid_friend_code", "Friend codes look like ABCD-1234")
	}
	return code, nil
}

func (s *Service) AddFriend(ctx context.Context, userID uuid.UUID, code string) (uuid.UUID, error) {
	code, err := normalizeCode(code)
	if err != nil {
		return uuid.Nil, err
	}
	var id uuid.UUID
	err = s.store.Tx(ctx, func(q *store.Q) error {
		target, err := q.GetUserByFriendCode(ctx, code)
		switch {
		case err != nil:
			return found(err, errTrainerNotFound)
		case target.ID == userID:
			return errs.BadRequest("cannot_add_self", "That's your own friend code")
		case target.IsPrivate:
			return errs.Forbidden("user_private", "This trainer isn't accepting requests")
		}
		if _, err := q.FriendshipAny(ctx, userID, target.ID); err == nil {
			return errAlreadyFriends
		} else if !errors.Is(err, store.ErrNotFound) {
			return err
		}
		n, err := q.CountFriends(ctx, userID)
		if err != nil {
			return err
		}
		if n >= game.MaxFriends {
			return errFriendLimit
		}
		id, err = q.RequestFriend(ctx, userID, target.ID)
		if store.IsUniqueViolation(err) {
			return errAlreadyFriends
		}
		return err
	})
	return id, err
}

func (s *Service) AcceptFriend(ctx context.Context, userID, friendshipID uuid.UUID) ([]string, error) {
	var unlocked []string
	err := s.store.Tx(ctx, func(q *store.Q) error {
		f, err := q.LockFriendship(ctx, friendshipID)
		switch {
		case err != nil:
			return found(err, errFriendNotFound)
		case f.FriendID != userID:
			return errs.Forbidden("not_authorized", "Only the recipient can accept")
		case f.Status != "pending":
			return errs.Conflict("already_accepted", "Already friends")
		}
		n, err := q.CountFriends(ctx, userID)
		if err != nil {
			return err
		}
		if n >= game.MaxFriends {
			return errFriendLimit
		}
		if err := q.AcceptFriendship(ctx, f.ID); err != nil {
			return err
		}
		for _, id := range []uuid.UUID{userID, f.UserID} {
			count, err := q.CountFriends(ctx, id)
			if err != nil {
				return err
			}
			ids, err := q.Unlock(ctx, id, game.Reached(game.Progress{game.StatFriends: count})...)
			if err != nil {
				return err
			}
			if id == userID {
				unlocked = ids
			}
		}
		return nil
	})
	return unlocked, err
}

// RemoveFriend unfriends, declines or cancels, depending on the friendship's state.
func (s *Service) RemoveFriend(ctx context.Context, userID, friendshipID uuid.UUID) error {
	return s.store.Tx(ctx, func(q *store.Q) error {
		f, err := q.LockFriendship(ctx, friendshipID)
		if err != nil || (f.UserID != userID && f.FriendID != userID) {
			return found(store.ErrNotFound, errFriendNotFound)
		}
		return q.DeleteFriendship(ctx, f.ID)
	})
}

type FriendProfile struct {
	Trainer
	FriendshipID *uuid.UUID   `json:"friendshipId"`
	Buddy        *PokemonView `json:"buddy"`
}

// FriendProfile shows a trainer to themselves or to an accepted friend.
func (s *Service) FriendProfile(ctx context.Context, userID uuid.UUID, code string) (FriendProfile, error) {
	code, err := normalizeCode(code)
	if err != nil {
		return FriendProfile{}, err
	}
	q := s.store.Q()
	target, err := q.GetUserByFriendCode(ctx, code)
	if err != nil {
		return FriendProfile{}, found(err, errTrainerNotFound)
	}
	p := FriendProfile{Trainer: trainerOf(target)}
	if target.ID != userID {
		f, err := q.FriendshipBetween(ctx, userID, target.ID)
		if err != nil {
			return FriendProfile{}, found(err, errs.Forbidden("not_authorized", "Only friends can view this profile"))
		}
		p.FriendshipID = &f.ID
	}
	p.Buddy, err = s.buddy(ctx, q, target.FavoritePokemonID)
	return p, err
}
