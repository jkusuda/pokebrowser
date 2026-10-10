// Database schema types — single source of truth for both the web app and
// the Chrome extension.

import type { ThemeId } from "./themes";

export * from "./themes";

// public.users — trainer profile
export interface User {
  id: string;
  trainer_name: string;
  favorite_pokemon_id: string | null;
  avatar_id: string;
  friend_code: string;
  level: number;
  xp: number;
  created_at: string;
  catch_limit: number;
  is_private: boolean;
  unclaimed_candy_levels: number;
  displayed_badges: string[]; // achievement ids, max 3 (set via set_displayed_badges RPC)
  theme: ThemeId; // profile color theme — ids/palettes live in ./themes.ts; keep the users_theme_check DB constraint in sync
  catches_today: number; // daily catch cap counter, written only by _catch_pokemon
  catches_today_date: string | null; // UTC date the counter applies to
  has_seen_tutorial: boolean; // gates the onboarding tutorial popup to once per account
  is_admin: boolean; // unlocks /admin and the dev_* RPCs; set manually in the DB

  // Account-level extension preferences, set from the website's settings page.
  // The extension mirrors these into chrome.storage during GET_SESSION (see
  // extension/src/lib/account-prefs.ts) — device-level prefs like audio volume
  // and buddy corner live only in chrome.storage and are not represented here.
  sound_enabled: boolean;
  encounter_animations_enabled: boolean; // gates the pokeball catch sequence
  blocked_sites: string[]; // bare lowercase hostnames; an entry covers its subdomains
}

// public.friends — friend relationships
export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted";
  created_at: string;
}

// Enriched outgoing friend row joined with the friend's public user data
export type FriendWithUser = Friend & {
  friend: Pick<User, "trainer_name" | "avatar_id" | "level" | "xp" | "friend_code" | "favorite_pokemon_id">;
};

// Incoming pending request joined with the requester's public user data
export type IncomingRequest = Friend & {
  requester: Pick<User, "trainer_name" | "avatar_id" | "level" | "friend_code">;
};

// Public view of a friend's profile used by FriendProfileCard
export interface FriendProfile {
  id: string;               // target user's id
  friendship_id: string;    // friends row id — used for remove action
  trainer_name: string;
  avatar_id: string;
  level: number;
  xp: number;
  friend_code: string;
  favorite_pokemon_id: string | null;
  displayed_badges: string[];
  buddy: Pick<Pokemon, "id" | "pokedex_number" | "is_shiny" | "nickname"> | null;
}

// public.pokemon — individual caught instance
export interface Pokemon {
  id: string;
  user_id: string;
  pokedex_number: number;
  nickname: string | null;
  is_shiny: boolean;
  caught_at: string;
  caught_on: string | null;
}

// public.candies — candy per family per trainer
export interface Candy {
  id: string;
  user_id: string;
  pokedex_number: number;
  count: number;
}

// public.pokedex — unlocked species history
export interface PokedexUnlock {
  user_id: string;
  pokedex_number: number;
  unlocked_at: string;
}

// Partial select used by the extension popup's recent-catches grid.
export type RecentPokemon = Pick<
  Pokemon,
  "id" | "pokedex_number" | "nickname" | "is_shiny" | "caught_at"
>;

// public.user_stats — persistent catch statistics (survives releases)
export interface UserStats {
  user_id: string;
  total_catches: number;
  caught_websites: string[];
  types_caught: string[];
  active_dates: string[]; // 'YYYY-MM-DD' days the trainer caught something (persists across releases)
  current_streak: number;
  longest_streak: number;
  last_catch_date: string | null; // 'YYYY-MM-DD'
  total_releases: number;
  has_nicknamed: boolean;
  trainer_name_changed: boolean;
  avatar_changed: boolean;
  updated_at: string;
}

// public.achievement_unlocks — one row per achievement earned by a user
export interface AchievementUnlock {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  claimed_at: string | null;
}

// The stat an event ranks its leaderboard by — one per event.
// Keep in sync with the events.tracked_stat CHECK constraint.
export type EventTrackedStat =
  | "total_catches"
  | "shiny_catches"
  | "type_catches"
  | "evolutions"
  | "unique_species";

// Applied server-side while the event is active (via _event_bonus_multiplier):
// xp/candy scale inside _catch_pokemon, shiny rate inside roll_encounter and
// redeem_token. `label` is what the UI displays.
export interface EventBonus {
  type: "xp_multiplier" | "candy_multiplier" | "shiny_rate_multiplier";
  value: number; // e.g. 2 for 2x
  label: string; // e.g. "2x XP"
}

// public.events — admin-scheduled time-boxed events ("GameEvent" avoids the DOM Event clash)
export interface GameEvent {
  id: string;
  name: string;
  description: string;
  starts_at: string;
  ends_at: string;
  tracked_stat: EventTrackedStat;
  type_filter: string | null; // set iff tracked_stat is "type_catches"
  bonuses: EventBonus[];
  // Spawn modifiers, applied by _roll_wild_species while the event is live.
  spotlight_pokedex: number | null; // never a mythical
  spotlight_rate: number | null; // share of wild spawns, (0, 0.9]; set iff spotlight_pokedex is
  boosted_types: string[]; // at most 3
  type_boost: number; // spawn weight for boosted types; 1 iff boosted_types is empty
  // Community goal: sum of everyone's tracked-stat score. Reaching it grants
  // every participant one reward token. All null when the event has no goal.
  community_goal: number | null;
  community_progress: number;
  goal_reached_at: string | null;
  reward_token_type: EventRewardTokenType | null;
  reward_pokedex: number | null; // set iff reward_token_type is "species"
  created_at: string;
}

export type EventRewardTokenType = Token["token_type"];

// public.event_progress — per-user score in one event (written only by _record_event_progress)
export interface EventProgress {
  event_id: string;
  user_id: string;
  count: number;
  species: number[]; // unique_species dedup only; empty otherwise
  updated_at: string;
}

// public.tokens — special encounter tokens granted as achievement/level/event rewards
export interface Token {
  id: string;
  user_id: string;
  token_type: "legendary" | "mythical" | "type_pick" | "shiny" | "species";
  type_filter: string | null; // null until user selects a type (type_pick only)
  pokedex_number: number | null; // the exact species (species only)
  event_id: string | null; // set when granted as an event's community reward
  created_at: string;
  used_at: string | null;     // null = available
}
