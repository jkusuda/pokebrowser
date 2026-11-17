package metrics

import (
	"errors"
	"testing"

	"github.com/prometheus/client_golang/prometheus/testutil"
)

func TestObserveFinalizer(t *testing.T) {
	m := New()
	m.ObserveFinalizer(2, nil)
	m.ObserveFinalizer(0, errors.New("db down"))

	if got := testutil.ToFloat64(m.finalizerRuns.WithLabelValues("ok")); got != 1 {
		t.Errorf("ok runs = %v", got)
	}
	if got := testutil.ToFloat64(m.finalizerRuns.WithLabelValues("error")); got != 1 {
		t.Errorf("error runs = %v", got)
	}
	if got := testutil.ToFloat64(m.eventsFinalized); got != 2 {
		t.Errorf("events finalized = %v", got)
	}
	if testutil.ToFloat64(m.lastFinalized) == 0 {
		t.Error("last success timestamp not set")
	}
}
