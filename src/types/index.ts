// Database schema types — re-exported from the shared workspace package so
// the extension and the web app stay in lockstep.
export type {
  User,
  Friend,
  FriendWithUser,
  IncomingRequest,
  FriendProfile,
  Pokemon,
  Candy,
  PokedexUnlock,
  RecentPokemon,
  UserStats,
  AchievementUnlock,
  Token,
} from "shared-types";

// Static Pokémon data — re-exported from the shared package
export type { PokemonData as PokemonInfo } from "pokemon-data";

// ─── Leaderboard (Global Stats) ──────────────────────────────────────────────
// App-level shapes returned by the get_leaderboard RPC — not Supabase row types.
export type LeaderboardCategory = "catches" | "sites";

/** One ranked row. Identity fields are null for masked (private, non-self) users. */
export interface LeaderboardEntry {
  rank: number;
  value: number;
  is_private: boolean;
  is_me: boolean;
  id: string | null;
  trainer_name: string | null;
  avatar_id: string | null;
  friend_code: string | null;
}

/** The caller's own placement (always unmasked), or null if they have no stats yet. */
export interface LeaderboardMe {
  rank: number;
  value: number;
  trainer_name: string;
  avatar_id: string;
  friend_code: string;
}

export interface LeaderboardResponse {
  top: LeaderboardEntry[];
  me: LeaderboardMe | null;
}
