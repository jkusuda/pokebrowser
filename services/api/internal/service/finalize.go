package service

import (
	"context"
	"time"

	"github.com/jkusuda/pokebrowser/services/api/internal/store"
)

// FinalizeEndedEvents awards event_champion to each ended event's top three
// (ties included) and marks it finalized. It returns how many it finalized.
func (s *Service) FinalizeEndedEvents(ctx context.Context) (int, error) {
	var n int
	err := s.store.Tx(ctx, func(q *store.Q) error {
		now := s.now()
		ids, err := q.LockEndedEvents(ctx, now)
		if err != nil {
			return err
		}
		for _, id := range ids {
			top, err := q.TopRanked(ctx, id, 3)
			if err != nil {
				return err
			}
			if len(top) > 0 {
				if err := q.UnlockForUsers(ctx, top, "event_champion"); err != nil {
					return err
				}
			}
			if err := q.MarkFinalized(ctx, id, now); err != nil {
				return err
			}
		}
		n = len(ids)
		return nil
	})
	return n, err
}

// RunFinalizer finalizes ended events every interval until ctx is cancelled.
func (s *Service) RunFinalizer(ctx context.Context, interval time.Duration) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		n, err := s.FinalizeEndedEvents(ctx)
		s.metrics.ObserveFinalizer(n, err)
		if err != nil {
			s.log.ErrorContext(ctx, "finalize events", "err", err)
		} else if n > 0 {
			s.log.InfoContext(ctx, "finalized events", "count", n)
		}
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
	}
}
