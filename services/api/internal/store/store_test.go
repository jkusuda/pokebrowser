package store

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
)

// Seeded in supabase/seed/trainers.sql.
var seedAsh = uuid.MustParse("a5a5a5a5-0000-4000-8000-000000000001")

func TestAPIRoleCanReadEveryTable(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	s, err := Open(context.Background(), url)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	ctx := context.Background()
	q := s.Q()

	catalog, err := q.LoadCatalog(ctx)
	if err != nil || len(catalog.All) != 386 {
		t.Fatalf("catalog: %v, %d species", err, len(catalog.All))
	}
	if _, err := q.GetUser(ctx, seedAsh); err != nil {
		t.Errorf("users: %v", err)
	}
	if _, err := q.GetSettings(ctx, seedAsh); err != nil {
		t.Errorf("user_settings: %v", err)
	}
	if _, err := q.GetStats(ctx, seedAsh); err != nil {
		t.Errorf("user_stats: %v", err)
	}
	if err := s.Tx(ctx, func(q *Q) error { _, err := q.LockLimits(ctx, seedAsh); return err }); err != nil {
		t.Errorf("user_limits: %v", err)
	}
	if _, err := q.AllEvents(ctx); err != nil {
		t.Errorf("events: %v", err)
	}
}
