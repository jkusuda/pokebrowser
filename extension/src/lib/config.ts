import { z } from "zod";

// Vite exposes import.meta.env.VITE_* at build time. Anything provided gets
// validated; anything missing falls back to the committed default so a fresh
// `git clone` still builds. Override per-environment via `extension/.env`.

const DEFAULTS = {
  SUPABASE_URL: "https://nxshczmwkznapzgprkcc.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54c2hjem13a3puYXB6Z3Bya2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTIzMjUsImV4cCI6MjA4NzYyODMyNX0.c9o3R2Jp11rnd_jnVcpSW20SxOUeQNo6A36jpqkh-tE",
  WEBSITE_URL: "https://www.pokebrowser.net",
} as const;

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().default(DEFAULTS.SUPABASE_URL),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).default(DEFAULTS.SUPABASE_ANON_KEY),
  VITE_WEBSITE_URL: z.string().url().default(DEFAULTS.WEBSITE_URL),
});

const env = envSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_WEBSITE_URL: import.meta.env.VITE_WEBSITE_URL,
});

export const CONFIG = {
  SUPABASE_URL: env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
  WEBSITE_URL: env.VITE_WEBSITE_URL,

  SESSION_KEY: "pb_session",
  THEME_KEY: "pb_theme",

  GAME: {
    SHINY_RATE: 1 / 512,
    ENCOUNTER_RATE: 0.15,
    CATCH_COOLDOWN_MS: 1500,
    PENDING_ENCOUNTER_TTL_MS: 5 * 60 * 1000,
    DEFAULT_CATCH_LIMIT: 200,
    CURRENT_GENERATION: 1 as const,
  },
} as const;
