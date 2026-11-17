package store

import (
	"context"
	"sync/atomic"

	"github.com/jackc/pgx/v5"
)

type roundTripsKey struct{}

// CountRoundTrips returns a context whose database round trips are counted.
// A batch counts once, since it travels to the database together.
func CountRoundTrips(ctx context.Context) (context.Context, *atomic.Int64) {
	n := new(atomic.Int64)
	return context.WithValue(ctx, roundTripsKey{}, n), n
}

func countRoundTrip(ctx context.Context) {
	if n, ok := ctx.Value(roundTripsKey{}).(*atomic.Int64); ok {
		n.Add(1)
	}
}

type roundTripTracer struct{}

func (roundTripTracer) TraceQueryStart(ctx context.Context, _ *pgx.Conn, _ pgx.TraceQueryStartData) context.Context {
	countRoundTrip(ctx)
	return ctx
}

func (roundTripTracer) TraceQueryEnd(context.Context, *pgx.Conn, pgx.TraceQueryEndData) {}

func (roundTripTracer) TraceBatchStart(ctx context.Context, _ *pgx.Conn, _ pgx.TraceBatchStartData) context.Context {
	countRoundTrip(ctx)
	return ctx
}

func (roundTripTracer) TraceBatchQuery(context.Context, *pgx.Conn, pgx.TraceBatchQueryData) {}

func (roundTripTracer) TraceBatchEnd(context.Context, *pgx.Conn, pgx.TraceBatchEndData) {}
