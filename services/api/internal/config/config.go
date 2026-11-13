package config

import (
	"errors"
	"fmt"
	"log/slog"
	"strings"
)

type Config struct {
	Port           string
	DatabaseURL    string
	SupabaseURL    string
	JWTSecret      string // legacy HS256 secret; empty disables HS256
	AllowedOrigins []string
	LogLevel       slog.Level
}

func (c Config) IssuerURL() string { return c.SupabaseURL + "/auth/v1" }
func (c Config) JWKSURL() string   { return c.SupabaseURL + "/auth/v1/.well-known/jwks.json" }

func Load(getenv func(string) string) (Config, error) {
	c := Config{
		Port:        or(getenv("PORT"), "8080"),
		DatabaseURL: getenv("DATABASE_URL"),
		SupabaseURL: strings.TrimRight(getenv("SUPABASE_URL"), "/"),
		JWTSecret:   getenv("SUPABASE_JWT_SECRET"),
	}

	for _, o := range strings.Split(getenv("ALLOWED_ORIGINS"), ",") {
		if o = strings.TrimSpace(o); o != "" {
			c.AllowedOrigins = append(c.AllowedOrigins, o)
		}
	}

	if err := c.LogLevel.UnmarshalText([]byte(or(getenv("LOG_LEVEL"), "info"))); err != nil {
		return Config{}, fmt.Errorf("LOG_LEVEL: %w", err)
	}

	var missing []string
	if c.DatabaseURL == "" {
		missing = append(missing, "DATABASE_URL")
	}
	if c.SupabaseURL == "" {
		missing = append(missing, "SUPABASE_URL")
	}
	if len(missing) > 0 {
		return Config{}, errors.New("missing required environment variables: " + strings.Join(missing, ", "))
	}
	return c, nil
}

func or(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}
