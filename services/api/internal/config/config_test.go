package config

import (
	"log/slog"
	"strings"
	"testing"
)

func env(m map[string]string) func(string) string {
	return func(k string) string { return m[k] }
}

func TestLoadDefaults(t *testing.T) {
	c, err := Load(env(map[string]string{
		"DATABASE_URL": "postgres://x",
		"SUPABASE_URL": "http://127.0.0.1:54321/",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if c.Port != "8080" {
		t.Errorf("Port = %q, want 8080", c.Port)
	}
	if c.LogLevel != slog.LevelInfo {
		t.Errorf("LogLevel = %v, want info", c.LogLevel)
	}
	if got, want := c.IssuerURL(), "http://127.0.0.1:54321/auth/v1"; got != want {
		t.Errorf("IssuerURL = %q, want %q (trailing slash should be trimmed)", got, want)
	}
}

func TestLoadAllowedOrigins(t *testing.T) {
	c, err := Load(env(map[string]string{
		"DATABASE_URL":    "postgres://x",
		"SUPABASE_URL":    "http://s",
		"ALLOWED_ORIGINS": " http://localhost:3000 , ,chrome-extension://abc",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if len(c.AllowedOrigins) != 2 || c.AllowedOrigins[0] != "http://localhost:3000" || c.AllowedOrigins[1] != "chrome-extension://abc" {
		t.Errorf("AllowedOrigins = %q", c.AllowedOrigins)
	}
}

func TestLoadMissingRequired(t *testing.T) {
	_, err := Load(env(nil))
	if err == nil {
		t.Fatal("expected an error")
	}
	for _, name := range []string{"DATABASE_URL", "SUPABASE_URL"} {
		if !strings.Contains(err.Error(), name) {
			t.Errorf("error %q should mention %s", err, name)
		}
	}
}

func TestLoadBadLogLevel(t *testing.T) {
	_, err := Load(env(map[string]string{"DATABASE_URL": "x", "SUPABASE_URL": "y", "LOG_LEVEL": "loud"}))
	if err == nil {
		t.Fatal("expected an error for LOG_LEVEL=loud")
	}
}
