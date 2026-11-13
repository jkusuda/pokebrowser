import { getPokemonName } from "pokemon-data";
import type { GameEvent, TokenType, TrackedStat } from "api-client";

export const EVENT_TRACKED_STATS: Record<
  TrackedStat,
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
) as TrackedStat[];

export const EVENT_MULTIPLIERS = [
  { key: "xpMultiplier", label: "XP" },
  { key: "candyMultiplier", label: "Candy" },
  { key: "shinyMultiplier", label: "Shiny Rate" },
] as const satisfies { key: keyof GameEvent; label: string }[];

/** Display labels for an event's active multipliers, e.g. "2× XP". */
export function eventBonuses(event: GameEvent): string[] {
  return EVENT_MULTIPLIERS.filter(({ key }) => event[key] !== 1).map(({ key, label }) => `${event[key]}× ${label}`);
}

export const EVENT_REWARD_TOKEN_TYPES: TokenType[] = [
  "species",
  "mythical",
  "legendary",
  "shiny",
  "type_pick",
];

export const TOKEN_TYPE_LABELS: Record<TokenType, string> = {
  species: "Pokémon Token",
  mythical: "Mythical Token",
  legendary: "Legendary Token",
  shiny: "Shiny Token",
  type_pick: "Type Token",
};

/** Display name for a token, e.g. "Celebi Token" for a species token. */
export function tokenLabel(tokenType: TokenType, pokedexNumber: number | null): string {
  if (tokenType === "species" && pokedexNumber !== null) {
    return `${getPokemonName(pokedexNumber)} Token`;
  }
  return TOKEN_TYPE_LABELS[tokenType];
}
