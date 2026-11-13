import { z } from "zod";

// VITE_* values are validated at build time and fall back to these production defaults.

const DEFAULTS = {
  SUPABASE_URL: "https://nxshczmwkznapzgprkcc.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54c2hjem13a3puYXB6Z3Bya2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTIzMjUsImV4cCI6MjA4NzYyODMyNX0.c9o3R2Jp11rnd_jnVcpSW20SxOUeQNo6A36jpqkh-tE",
  WEBSITE_URL: "https://www.pokebrowser.net",
  API_URL: "https://api.pokebrowser.net",
} as const;

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().default(DEFAULTS.SUPABASE_URL),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).default(DEFAULTS.SUPABASE_ANON_KEY),
  VITE_WEBSITE_URL: z.string().url().default(DEFAULTS.WEBSITE_URL),
  VITE_API_URL: z.string().url().default(DEFAULTS.API_URL),
});

// build:local must never fall back to the production defaults.
if (
  import.meta.env.MODE === "localstack" &&
  (!import.meta.env.VITE_SUPABASE_URL ||
    !import.meta.env.VITE_SUPABASE_ANON_KEY ||
    !import.meta.env.VITE_API_URL)
) {
  throw new Error(
    "build:local needs apps/extension/.env.localstack with VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and VITE_API_URL"
  );
}

const env = envSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_WEBSITE_URL: import.meta.env.VITE_WEBSITE_URL,
  VITE_API_URL: import.meta.env.VITE_API_URL,
});

export const CONFIG = {
  SUPABASE_URL: env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
  WEBSITE_URL: env.VITE_WEBSITE_URL,
  API_URL: env.VITE_API_URL,

  SESSION_KEY: "pb_session",
  THEME_KEY: "pb_theme",
  BUDDY_KEY: "pb_buddy",
  BUDDY_PREFS_KEY: "pb_buddy_prefs",
  BUDDY_TTL_MS: 10 * 60 * 1000,
  AUDIO_PREFS_KEY: "pb_audio_prefs",
  UPDATE_NOTICE_KEY: "pb_update_notice",
  NEXT_ROLL_KEY: "pb_next_roll",
  ACCOUNT_PREFS_KEY: "pb_account_prefs",

  ROLL_IN_FLIGHT_MS: 5 * 1000,
} as const;
