// Event tracked-stat and bonus metadata shared by EventsPage, the admin events
// section, and the /api/admin/events route validation.
// Server-safe: imported by API routes — no static image imports allowed here
// (same rule as achievements-data.ts).

import { getPokemonName } from "pokemon-data";
import type { EventBonus, EventRewardTokenType, EventTrackedStat } from "@/types";

export const EVENT_TRACKED_STATS: Record<
  EventTrackedStat,
  { label: string; unit: string }
> = {
  total_catches: { label: "Pokémon Caught", unit: "caught" },
  shiny_catches: { label: "Shinies Caught", unit: "shinies" },
  type_catches: { label: "Type Catches", unit: "caught" },
  evolutions: { label: "Pokémon Evolved", unit: "evolved" },
  unique_species: { label: "Unique Species Caught", unit: "species" },
};

export const EVENT_TRACKED_STAT_KEYS = Object.keys(
  EVENT_TRACKED_STATS
) as EventTrackedStat[];

export const EVENT_BONUS_TYPES: EventBonus["type"][] = [
  "xp_multiplier",
  "candy_multiplier",
  "shiny_rate_multiplier",
];

export const EVENT_BONUS_TYPE_LABELS: Record<EventBonus["type"], string> = {
  xp_multiplier: "XP",
  candy_multiplier: "Candy",
  shiny_rate_multiplier: "Shiny Rate",
};

/**
 * Hard cap on a bonus multiplier. Bonuses are applied server-side as
 * `round(xp * value)::int`, so an unbounded value overflows int4 and fails
 * every catch while the event is live. Mirrored by the `_event_bonuses_valid`
 * DB helper and the clamp in `_event_bonus_multiplier` — keep the three in sync.
 */
export const MAX_BONUS_VALUE = 100;

// Spawn-modifier and community-goal limits. Mirrored by the events CHECK
// constraints and the _validate_event_modifiers DB helper — keep in sync.

/** Upper bound on a spotlight's share of wild spawns (0.9 = 90%). */
export const MAX_SPOTLIGHT_RATE = 0.9;
/** Upper bound on the spawn weight given to boosted types. */
export const MAX_TYPE_BOOST = 20;
/** Most types one event can boost. */
export const MAX_BOOSTED_TYPES = 3;

export const EVENT_REWARD_TOKEN_TYPES: EventRewardTokenType[] = [
  "species",
  "mythical",
  "legendary",
  "shiny",
  "type_pick",
];

export const TOKEN_TYPE_LABELS: Record<EventRewardTokenType, string> = {
  species: "Pokémon Token",
  mythical: "Mythical Token",
  legendary: "Legendary Token",
  shiny: "Shiny Token",
  type_pick: "Type Token",
};

/** Display name for a token, e.g. "Celebi Token" for a species token. */
export function tokenLabel(tokenType: EventRewardTokenType, pokedexNumber: number | null): string {
  if (tokenType === "species" && pokedexNumber !== null) {
    return `${getPokemonName(pokedexNumber)} Token`;
  }
  return TOKEN_TYPE_LABELS[tokenType];
}
