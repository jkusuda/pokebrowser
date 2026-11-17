// Package metrics exposes the API's Prometheus metrics.
package metrics

import (
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type Metrics struct {
	registry *prometheus.Registry

	requests        *prometheus.CounterVec
	duration        *prometheus.HistogramVec
	roundTrips      *prometheus.HistogramVec
	finalizerRuns   *prometheus.CounterVec
	eventsFinalized prometheus.Counter
	lastFinalized   prometheus.Gauge
}

func New() *Metrics {
	m := &Metrics{
		registry: prometheus.NewRegistry(),
		requests: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "HTTP requests by route and status code.",
		}, []string{"route", "status"}),
		duration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency by route.",
			Buckets: []float64{.005, .01, .025, .05, .075, .1, .15, .2, .3, .5, 1, 2.5, 5},
		}, []string{"route"}),
		roundTrips: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "http_request_db_round_trips",
			Help:    "Database round trips made per HTTP request, by route.",
			Buckets: []float64{0, 1, 2, 4, 6, 8, 10, 12, 15, 20, 25, 30, 40},
		}, []string{"route"}),
		finalizerRuns: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "finalizer_runs_total",
			Help: "Event finalizer runs by result.",
		}, []string{"result"}),
		eventsFinalized: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "events_finalized_total",
			Help: "Events finalized and awarded.",
		}),
		lastFinalized: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "finalizer_last_success_timestamp_seconds",
			Help: "Unix time of the last successful finalizer run.",
		}),
	}
	m.registry.MustRegister(
		m.requests, m.duration, m.roundTrips, m.finalizerRuns, m.eventsFinalized, m.lastFinalized,
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
	)
	return m
}

func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{})
}

// ObserveRequest records one request. route is the matched mux pattern, so
// path ids never become label values.
func (m *Metrics) ObserveRequest(route string, status int, elapsed time.Duration, roundTrips int64) {
	if route == "" {
		route = "unmatched"
	}
	m.requests.WithLabelValues(route, strconv.Itoa(status)).Inc()
	m.duration.WithLabelValues(route).Observe(elapsed.Seconds())
	m.roundTrips.WithLabelValues(route).Observe(float64(roundTrips))
}

func (m *Metrics) ObserveFinalizer(finalized int, err error) {
	if err != nil {
		m.finalizerRuns.WithLabelValues("error").Inc()
		return
	}
	m.finalizerRuns.WithLabelValues("ok").Inc()
	m.eventsFinalized.Add(float64(finalized))
	m.lastFinalized.SetToCurrentTime()
}

// WatchPool reports database pool usage, read fresh on every scrape.
func (m *Metrics) WatchPool(stat func() *pgxpool.Stat) {
	gauge := func(name, help string, value func(*pgxpool.Stat) float64) prometheus.Collector {
		return prometheus.NewGaugeFunc(prometheus.GaugeOpts{Name: name, Help: help}, func() float64 { return value(stat()) })
	}
	counter := func(name, help string, value func(*pgxpool.Stat) float64) prometheus.Collector {
		return prometheus.NewCounterFunc(prometheus.CounterOpts{Name: name, Help: help}, func() float64 { return value(stat()) })
	}
	m.registry.MustRegister(
		gauge("db_pool_acquired_conns", "Connections in use.", func(s *pgxpool.Stat) float64 { return float64(s.AcquiredConns()) }),
		gauge("db_pool_idle_conns", "Idle connections.", func(s *pgxpool.Stat) float64 { return float64(s.IdleConns()) }),
		gauge("db_pool_max_conns", "Pool size limit.", func(s *pgxpool.Stat) float64 { return float64(s.MaxConns()) }),
		counter("db_pool_acquires_total", "Connections acquired.", func(s *pgxpool.Stat) float64 { return float64(s.AcquireCount()) }),
		counter("db_pool_empty_acquires_total", "Acquires that waited because no connection was free.", func(s *pgxpool.Stat) float64 { return float64(s.EmptyAcquireCount()) }),
		counter("db_pool_acquire_wait_seconds_total", "Time spent waiting to acquire connections.", func(s *pgxpool.Stat) float64 { return s.AcquireDuration().Seconds() }),
	)
}
