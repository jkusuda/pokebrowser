package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jkusuda/pokebrowser/services/api/internal/auth"
	"github.com/jkusuda/pokebrowser/services/api/internal/config"
	"github.com/jkusuda/pokebrowser/services/api/internal/httpapi"
	"github.com/jkusuda/pokebrowser/services/api/internal/metrics"
	"github.com/jkusuda/pokebrowser/services/api/internal/service"
	"github.com/jkusuda/pokebrowser/services/api/internal/store"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		return err
	}

	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))
	slog.SetDefault(log)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := store.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer db.Close()

	catalog, err := db.Q().LoadCatalog(ctx)
	if err != nil {
		return err
	}
	m := metrics.New()
	m.WatchPool(db.Stat)
	svc := service.New(db, catalog, log, m)
	go svc.RunFinalizer(ctx, 5*time.Minute)

	srv := &http.Server{
		Addr: ":" + cfg.Port,
		Handler: httpapi.NewRouter(httpapi.Deps{
			Log:            log,
			Verifier:       auth.NewVerifier(cfg.IssuerURL(), auth.NewJWKS(cfg.JWKSURL(), nil), cfg.JWTSecret),
			Service:        svc,
			Metrics:        m,
			AllowedOrigins: cfg.AllowedOrigins,
		}),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Metrics get their own port so they're reachable by Fly's scraper but not the public.
	metricsSrv := &http.Server{
		Addr:              ":" + cfg.MetricsPort,
		Handler:           m.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	serveErr := make(chan error, 2)
	go func() {
		log.Info("listening", "addr", srv.Addr, "supabase", cfg.SupabaseURL)
		serveErr <- srv.ListenAndServe()
	}()
	go func() {
		serveErr <- metricsSrv.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		return err
	case <-ctx.Done():
	}

	log.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	metricsSrv.Shutdown(shutdownCtx)
	if err := srv.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
