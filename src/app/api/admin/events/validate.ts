// Shared validation for the admin event create/update routes (not a route file).
import type { DevEventInput } from "@/lib/queries";
import { POKEMON_TYPES } from "@/lib/types";
import { getPokemonData } from "pokemon-data";
import {
  EVENT_TRACKED_STAT_KEYS,
  EVENT_BONUS_TYPES,
  MAX_BONUS_VALUE,
  EVENT_REWARD_TOKEN_TYPES,
  MAX_SPOTLIGHT_RATE,
  MAX_TYPE_BOOST,
  MAX_BOOSTED_TYPES,
} from "@/lib/events-data";

const VALID_TRACKED_STATS = new Set<string>(EVENT_TRACKED_STAT_KEYS);
const VALID_TYPES = new Set<string>(POKEMON_TYPES);
const VALID_BONUS_TYPES = new Set<string>(EVENT_BONUS_TYPES);
const VALID_REWARD_TOKEN_TYPES = new Set<string>(EVENT_REWARD_TOKEN_TYPES);

/** True for a pokedex number that exists in the shipped data. */
function isPokedexNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && getPokemonData(value) !== null;
}

type ValidationResult = { input: DevEventInput; error: null } | { input: null; error: string };

export function validateEventInput(body: Record<string, unknown> | null): ValidationResult {
  if (body === null) {
    return { input: null, error: "body must be a JSON object" };
  }
  const {
    name, description, startsAt, endsAt, trackedStat, typeFilter, bonuses,
    spotlightPokedex, spotlightRate, boostedTypes, typeBoost,
    communityGoal, rewardTokenType, rewardPokedex,
  } = body;

  if (typeof name !== "string" || name.length < 1 || name.length > 60) {
    return { input: null, error: "name must be a string of 1-60 characters" };
  }
  const desc = description ?? "";
  if (typeof desc !== "string" || desc.length > 500) {
    return { input: null, error: "description must be a string of at most 500 characters" };
  }
  if (typeof startsAt !== "string" || Number.isNaN(Date.parse(startsAt))) {
    return { input: null, error: "startsAt must be a valid ISO date string" };
  }
  if (typeof endsAt !== "string" || Number.isNaN(Date.parse(endsAt))) {
    return { input: null, error: "endsAt must be a valid ISO date string" };
  }
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    return { input: null, error: "endsAt must be after startsAt" };
  }
  if (typeof trackedStat !== "string" || !VALID_TRACKED_STATS.has(trackedStat)) {
    return { input: null, error: `trackedStat must be one of: ${[...VALID_TRACKED_STATS].join(", ")}` };
  }
  const filter = typeFilter ?? null;
  if (trackedStat === "type_catches") {
    if (typeof filter !== "string" || !VALID_TYPES.has(filter.toLowerCase())) {
      return { input: null, error: `typeFilter must be one of: ${[...VALID_TYPES].join(", ")}` };
    }
  } else if (filter !== null) {
    return { input: null, error: "typeFilter is only allowed when trackedStat is type_catches" };
  }
  const bonusList = bonuses ?? [];
  if (!Array.isArray(bonusList)) {
    return { input: null, error: "bonuses must be an array" };
  }
  // The upper bound matters: multipliers are applied server-side in
  // _catch_pokemon as round(xp * value)::int, so an absurd value would
  // overflow int4 and fail every catch while the event is live. The
  // _event_bonuses_valid DB helper enforces the same cap.
  for (const bonus of bonusList) {
    const b = bonus as Record<string, unknown>;
    if (
      typeof bonus !== "object" || bonus === null || Array.isArray(bonus) ||
      typeof b.type !== "string" || !VALID_BONUS_TYPES.has(b.type) ||
      typeof b.value !== "number" || !Number.isFinite(b.value) ||
      b.value <= 0 || b.value > MAX_BONUS_VALUE ||
      typeof b.label !== "string" || b.label.length < 1 || b.label.length > 30
    ) {
      return {
        input: null,
        error: `each bonus must be {type: ${[...VALID_BONUS_TYPES].join("|")}, value: number in (0, ${MAX_BONUS_VALUE}], label: 1-30 chars}`,
      };
    }
  }

  // Spawn modifiers and community goal — mirror _validate_event_modifiers.
  const spotlight = spotlightPokedex ?? null;
  const spotRate = spotlightRate ?? null;
  if (spotlight !== null || spotRate !== null) {
    if (!isPokedexNumber(spotlight) || getPokemonData(spotlight)?.isMythical) {
      return { input: null, error: "spotlightPokedex must be a non-mythical Pokédex number" };
    }
    if (typeof spotRate !== "number" || !(spotRate > 0 && spotRate <= MAX_SPOTLIGHT_RATE)) {
      return { input: null, error: `spotlightRate must be a number in (0, ${MAX_SPOTLIGHT_RATE}]` };
    }
  }

  const boosted = boostedTypes ?? [];
  if (
    !Array.isArray(boosted) ||
    boosted.length > MAX_BOOSTED_TYPES ||
    boosted.some((t) => typeof t !== "string" || !VALID_TYPES.has(t.toLowerCase()))
  ) {
    return { input: null, error: `boostedTypes must be up to ${MAX_BOOSTED_TYPES} valid types` };
  }
  const boostedLower = (boosted as string[]).map((t) => t.toLowerCase());
  if (new Set(boostedLower).size !== boostedLower.length) {
    return { input: null, error: "boostedTypes must not repeat a type" };
  }
  const boost = typeBoost ?? 1;
  if (
    typeof boost !== "number" || !Number.isFinite(boost) ||
    boost < 1 || boost > MAX_TYPE_BOOST ||
    (boostedLower.length === 0) !== (boost === 1)
  ) {
    return {
      input: null,
      error: `typeBoost must be in (1, ${MAX_TYPE_BOOST}] with boosted types, or 1 without`,
    };
  }

  const goal = communityGoal ?? null;
  if (goal !== null && (typeof goal !== "number" || !Number.isInteger(goal) || goal <= 0)) {
    return { input: null, error: "communityGoal must be a positive integer" };
  }
  const rewardType = rewardTokenType ?? null;
  const rewardMon = rewardPokedex ?? null;
  if ((goal === null) !== (rewardType === null)) {
    return { input: null, error: "communityGoal and rewardTokenType must be set together" };
  }
  if (rewardType !== null && (typeof rewardType !== "string" || !VALID_REWARD_TOKEN_TYPES.has(rewardType))) {
    return {
      input: null,
      error: `rewardTokenType must be one of: ${[...VALID_REWARD_TOKEN_TYPES].join(", ")}`,
    };
  }
  if ((rewardType === "species") !== (rewardMon !== null) || (rewardMon !== null && !isPokedexNumber(rewardMon))) {
    return { input: null, error: "rewardPokedex must be a Pokédex number, set only for species rewards" };
  }

  return {
    input: {
      name,
      description: desc,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      trackedStat,
      typeFilter: trackedStat === "type_catches" ? (filter as string).toLowerCase() : null,
      bonuses: bonusList,
      spotlightPokedex: spotlight as number | null,
      spotlightRate: spotRate as number | null,
      boostedTypes: boostedLower,
      typeBoost: boost,
      communityGoal: goal as number | null,
      rewardTokenType: rewardType as string | null,
      rewardPokedex: rewardMon as number | null,
    },
    error: null,
  };
}
