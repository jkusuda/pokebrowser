// Database schema types — re-exported from the shared workspace package so
// the extension and the web app stay in lockstep.
import type { GameEvent } from "shared-types";

export type {
  User,
  Friend,
  FriendWithUser,
  IncomingRequest,
  FriendProfile,
  Pokemon,
  Candy,
  PokedexUnlock,
  UserStats,
  AchievementUnlock,
  Token,
  EventTrackedStat,
  EventBonus,
  GameEvent,
  EventProgress,
  EventRewardTokenType,
} from "shared-types";

// Static Pokémon data — re-exported from the shared package
export type { PokemonData as PokemonInfo } from "pokemon-data";

// ─── Leaderboard (Global Stats) ──────────────────────────────────────────────
// App-level shapes returned by the get_leaderboard RPC — not Supabase row types.
export type LeaderboardCategory = "catches" | "sites";

/**
 * One ranked row. Identity fields (`id`, `trainer_name`, `avatar_id`,
 * `friend_code`, `displayed_badges`) are null when the row is masked — i.e.
 * `is_private` is true, the row isn't the caller's own, and the caller isn't
 * an accepted friend of that user. Accepted friends see a private user's
 * full identity here, same as elsewhere in the app (e.g.
 * `/api/friends/profile/[friendCode]`). `is_private` itself is always
 * populated, even on unmasked rows.
 */
export interface LeaderboardEntry {
  rank: number;
  value: number;
  is_private: boolean;
  is_me: boolean;
  id: string | null;
  trainer_name: string | null;
  avatar_id: string | null;
  friend_code: string | null;
  displayed_badges: string[] | null;
}

/** The caller's own placement (always unmasked), or null if they have no stats yet. */
export interface LeaderboardMe {
  rank: number;
  value: number;
  trainer_name: string;
  avatar_id: string;
  friend_code: string;
  displayed_badges: string[];
}

export interface LeaderboardResponse {
  top: LeaderboardEntry[];
  me: LeaderboardMe | null;
}

// ─── Events ──────────────────────────────────────────────────────────────────
// Shape returned by GET /api/events. The event leaderboard
// (GET /api/events/leaderboard) reuses LeaderboardResponse as-is.
export interface EventsResponse {
  serverNow: string; // route-stamped ISO time for drift-free countdowns
  current: GameEvent | null;
  myProgress: number | null; // caller's count in the current event
  upcoming: GameEvent[]; // next 10, soonest first
  past: GameEvent[]; // last 10, most recently ended first
}
