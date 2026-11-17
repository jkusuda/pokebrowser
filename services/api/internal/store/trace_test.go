package store

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5"
)

func TestRoundTripTracer(t *testing.T) {
	ctx, n := CountRoundTrips(context.Background())
	var tr roundTripTracer
	tr.TraceQueryStart(ctx, nil, pgx.TraceQueryStartData{})
	tr.TraceQueryStart(ctx, nil, pgx.TraceQueryStartData{})
	tr.TraceBatchStart(ctx, nil, pgx.TraceBatchStartData{})
	tr.TraceBatchQuery(ctx, nil, pgx.TraceBatchQueryData{})
	if got := n.Load(); got != 3 {
		t.Errorf("round trips = %d, want 3", got)
	}

	tr.TraceQueryStart(context.Background(), nil, pgx.TraceQueryStartData{})
	if got := n.Load(); got != 3 {
		t.Errorf("uncounted context changed the count to %d", got)
	}
}
