package store

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Friendship struct {
	ID        uuid.UUID
	UserID    uuid.UUID // who sent the request
	FriendID  uuid.UUID // who received it
	Status    string
	CreatedAt time.Time
}

func (f Friendship) Other(me uuid.UUID) uuid.UUID {
	if f.UserID == me {
		return f.FriendID
	}
	return f.UserID
}

const friendshipColumns = `id, user_id, friend_id, status, created_at`

func scanFriendship(row interface{ Scan(...any) error }) (Friendship, error) {
	var f Friendship
	err := row.Scan(&f.ID, &f.UserID, &f.FriendID, &f.Status, &f.CreatedAt)
	return f, notFound(err)
}

func (q *Q) ListFriendships(ctx context.Context, userID uuid.UUID) ([]Friendship, error) {
	rows, err := q.db.Query(ctx, `
		select `+friendshipColumns+` from public.friends
		where user_id = $1 or friend_id = $1 order by created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []Friendship{}
	for rows.Next() {
		f, err := scanFriendship(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, f)
	}
	return list, rows.Err()
}

func (q *Q) LockFriendship(ctx context.Context, id uuid.UUID) (Friendship, error) {
	return scanFriendship(q.db.QueryRow(ctx, `select `+friendshipColumns+` from public.friends where id = $1 for update`, id))
}

// FriendshipBetween returns the accepted friendship between two trainers.
func (q *Q) FriendshipBetween(ctx context.Context, a, b uuid.UUID) (Friendship, error) {
	return scanFriendship(q.db.QueryRow(ctx, `
		select `+friendshipColumns+` from public.friends
		where status = 'accepted' and least(user_id, friend_id) = least($1::uuid, $2::uuid)
			and greatest(user_id, friend_id) = greatest($1::uuid, $2::uuid)`, a, b))
}

// FriendshipAny returns the friendship between two trainers in any state.
func (q *Q) FriendshipAny(ctx context.Context, a, b uuid.UUID) (Friendship, error) {
	return scanFriendship(q.db.QueryRow(ctx, `
		select `+friendshipColumns+` from public.friends
		where least(user_id, friend_id) = least($1::uuid, $2::uuid)
			and greatest(user_id, friend_id) = greatest($1::uuid, $2::uuid)`, a, b))
}

func (q *Q) RequestFriend(ctx context.Context, from, to uuid.UUID) (uuid.UUID, error) {
	var id uuid.UUID
	err := q.db.QueryRow(ctx, `
		insert into public.friends (user_id, friend_id) values ($1, $2) returning id`, from, to).Scan(&id)
	return id, err
}

func (q *Q) AcceptFriendship(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, `update public.friends set status = 'accepted' where id = $1`, id)
	return err
}

func (q *Q) DeleteFriendship(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, `delete from public.friends where id = $1`, id)
	return err
}

func (q *Q) CountFriends(ctx context.Context, userID uuid.UUID) (int, error) {
	var n int
	err := q.db.QueryRow(ctx, `
		select count(*) from public.friends
		where status = 'accepted' and (user_id = $1 or friend_id = $1)`, userID).Scan(&n)
	return n, err
}

func (q *Q) FriendIDs(ctx context.Context, userID uuid.UUID) (map[uuid.UUID]bool, error) {
	rows, err := q.db.Query(ctx, `
		select case when user_id = $1 then friend_id else user_id end
		from public.friends where status = 'accepted' and (user_id = $1 or friend_id = $1)`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := map[uuid.UUID]bool{}
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids[id] = true
	}
	return ids, rows.Err()
}
