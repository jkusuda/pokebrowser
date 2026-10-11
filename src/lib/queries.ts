import { SupabaseClient } from "@supabase/supabase-js";
import { User, Pokemon, Friend, FriendWithUser, IncomingRequest, PokedexUnlock, Candy, AchievementUnlock, Token, UserStats, LeaderboardCategory, LeaderboardResponse, GameEvent, EventsResponse } from "@/types";
import { ThemeId } from "@/lib/themes";

export async function getTrainerData(supabase: SupabaseClient, userId: string) {
  // ── Step 1: fetch base rows in parallel (no joins — FK points to auth.users,
  //   which PostgREST can't traverse to public.users automatically) ──────────
  const [
    profileResult,
    pokemonResult,
    allFriendRowsResult,
    pokedexResult,
    candiesResult,
    achievementUnlocksResult,
    tokensResult,
    userStatsResult,
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", userId).single(),
    supabase.from("pokemon").select("*").eq("user_id", userId).order("caught_at", { ascending: false }),
    // Fetch ALL rows where user appears on either side
    supabase
      .from("friends")
      .select("*")
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`),
    supabase.from("pokedex").select("pokedex_number, unlocked_at").eq("user_id", userId),
    supabase.from("candies").select("*").eq("user_id", userId),
    supabase
      .from("achievement_unlocks")
      .select("*")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: false }),
    supabase
      .from("tokens")
      .select("*")
      .eq("user_id", userId)
      .is("used_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .single(),
  ]);

  if (profileResult.error) throw profileResult.error;
  // Surface failures instead of silently rendering empty sections. user_stats
  // may legitimately have no row yet, so "no rows" (PGRST116) is allowed there.
  for (const result of [
    pokemonResult,
    allFriendRowsResult,
    pokedexResult,
    candiesResult,
    achievementUnlocksResult,
    tokensResult,
  ]) {
    if (result.error) throw result.error;
  }
  if (userStatsResult.error && userStatsResult.error.code !== "PGRST116") {
    throw userStatsResult.error;
  }

  const allRows = (allFriendRowsResult.data as Friend[]) ?? [];

  // Split into the three logical buckets
  const outgoingPending = allRows.filter((f) => f.user_id === userId && f.status === "pending");
  const incomingPending = allRows.filter((f) => f.friend_id === userId && f.status === "pending");
  const accepted        = allRows.filter((f) => f.status === "accepted");

  // ── Step 2: collect all "other" user IDs and fetch their public.users rows ─
  const relatedIds = [
    ...new Set([
      ...outgoingPending.map((f) => f.friend_id),
      ...incomingPending.map((f) => f.user_id),
      // For accepted rows the "other" person may be on either side
      ...accepted.map((f) => (f.user_id === userId ? f.friend_id : f.user_id)),
    ]),
  ];

  const relatedUsers: Pick<User, "id" | "trainer_name" | "avatar_id" | "level" | "xp" | "friend_code" | "favorite_pokemon_id">[] =
    relatedIds.length > 0
      ? ((await supabase
          .from("users")
          .select("id, trainer_name, avatar_id, level, xp, friend_code, favorite_pokemon_id")
          .in("id", relatedIds)).data ?? [])
      : [];

  const userById = Object.fromEntries(relatedUsers.map((u) => [u.id, u]));

  // ── Step 3: merge ──────────────────────────────────────────────────────────
  // `friends` covers accepted (both directions) + outgoing pending (for SENT tab)
  const friends: FriendWithUser[] = [
    ...accepted
      .map((f) => ({ ...f, friend: userById[f.user_id === userId ? f.friend_id : f.user_id] }))
      .filter((f) => f.friend),
    ...outgoingPending
      .map((f) => ({ ...f, friend: userById[f.friend_id] }))
      .filter((f) => f.friend),
  ];

  const incomingRequests: IncomingRequest[] = incomingPending
    .filter((f) => userById[f.user_id])
    .map((f) => ({ ...f, requester: userById[f.user_id] }));

  // ── Step 4: resolve buddy pokemon — always one of the user's own pokemon,
  //   so look it up in the already-fetched list instead of round-tripping. ──
  const user = profileResult.data as User;
  const pokemon = (pokemonResult.data as Pokemon[]) ?? [];
  const favoritePokemon = user.favorite_pokemon_id
    ? pokemon.find((p) => p.id === user.favorite_pokemon_id) ?? null
    : null;

  return {
    user,
    pokemon,
    friends,
    incomingRequests,
    pokedexUnlocks: (pokedexResult.data as PokedexUnlock[]) ?? [],
    favoritePokemon,
    candies: (candiesResult.data as Candy[]) ?? [],
    achievementUnlocks: (achievementUnlocksResult.data as AchievementUnlock[]) ?? [],
    tokens: (tokensResult.data as Token[]) ?? [],
    userStats: (userStatsResult.data as UserStats | null) ?? null,
  };
}


export async function updateTrainerProfile(
  supabase: SupabaseClient,
  userId: string,
  data: { trainerName: string; avatarId: string }
) {
  const { error } = await supabase
    .from("users")
    .update({ trainer_name: data.trainerName, avatar_id: data.avatarId })
    .eq("id", userId);
  if (error) throw error;
}

export async function updatePokemonNickname(
  supabase: SupabaseClient,
  pokemonId: string,
  nickname: string
) {
  const { error } = await supabase.from("pokemon").update({ nickname }).eq("id", pokemonId);
  if (error) throw error;
}

export async function releasePokemon(supabase: SupabaseClient, pokemonId: string) {
  const { error } = await supabase.from("pokemon").delete().eq("id", pokemonId);
  if (error) throw error;
}

/**
 * Evolve a caught Pokémon in place via the server-authoritative RPC.
 * `targetId` picks a branch on lines that split; null takes the canonical one.
 */
export async function evolvePokemon(
  supabase: SupabaseClient,
  pokemonId: string,
  targetId: number | null = null
) {
  const { data, error } = await supabase.rpc("evolve_pokemon", {
    p_pokemon_id: pokemonId,
    p_target_id: targetId,
  });
  if (error) throw error;
  return data as { to_pokedex_number: number; is_new_species: boolean };
}

// ─── Leaderboard ────────────────────────────────────────────────────────────

/**
 * Fetches the top 100 trainers for a category plus the caller's own placement
 * via the server-authoritative get_leaderboard RPC (user_stats RLS blocks
 * cross-user reads, so this can't be a plain client query).
 */
export async function getLeaderboard(
  supabase: SupabaseClient,
  category: LeaderboardCategory,
  friendsOnly: boolean = false
) {
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_category: category,
    p_limit: 100,
    p_friends_only: friendsOnly,
  });
  if (error) throw error;
  return data as LeaderboardResponse;
}

// ─── Events ─────────────────────────────────────────────────────────────────

/**
 * Display priority for overlapping live events: community-goal events lead
 * (everyone's working on them together), then spotlight events, then the rest.
 * Ties are broken by soonest end.
 */
function liveEventTier(event: GameEvent): number {
  if (event.community_goal !== null) return 0;
  if (event.spotlight_pokedex !== null) return 1;
  return 2;
}

/**
 * Fetches every live event (events can overlap) plus the caller's progress in
 * each, the next 10 upcoming events, and the last 10 past events. Direct table
 * reads — the events SELECT policy is open to authenticated users and
 * event_progress is RLS-scoped to self.
 */
export async function getEvents(supabase: SupabaseClient, userId: string): Promise<EventsResponse> {
  const now = new Date().toISOString();

  const [liveResult, upcomingResult, pastResult] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .lte("starts_at", now)
      .gt("ends_at", now)
      .order("ends_at", { ascending: true }),
    supabase
      .from("events")
      .select("*")
      .gt("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(10),
    supabase
      .from("events")
      .select("*")
      .lte("ends_at", now)
      .order("ends_at", { ascending: false })
      .limit(10),
  ]);

  if (liveResult.error) throw liveResult.error;
  if (upcomingResult.error) throw upcomingResult.error;
  if (pastResult.error) throw pastResult.error;

  // Arrives soonest-ending first; the stable sort keeps that order within each tier.
  const live = ((liveResult.data as GameEvent[]) ?? []).sort(
    (a, b) => liveEventTier(a) - liveEventTier(b)
  );

  const myProgress: Record<string, number> = {};
  if (live.length > 0) {
    // user_id is filtered explicitly rather than leaning on the self-only RLS
    // policy, so a widened policy could never leak other players' rows here.
    const { data, error } = await supabase
      .from("event_progress")
      .select("event_id, count")
      .in("event_id", live.map((e) => e.id))
      .eq("user_id", userId);
    if (error) throw error;
    for (const row of (data as { event_id: string; count: number }[]) ?? []) {
      myProgress[row.event_id] = row.count;
    }
  }

  return {
    serverNow: now,
    live,
    myProgress,
    upcoming: (upcomingResult.data as GameEvent[]) ?? [],
    past: (pastResult.data as GameEvent[]) ?? [],
  };
}

/**
 * Every event, newest window first — the admin panel needs the full schedule,
 * not the current + 10 upcoming + 10 past slice that `getEvents` returns.
 */
export async function getAllEvents(supabase: SupabaseClient): Promise<GameEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data as GameEvent[]) ?? [];
}

/**
 * Fetches the event leaderboard via the server-authoritative
 * get_event_leaderboard RPC (event_progress RLS is self-read only; the RPC
 * anonymizes private strangers the same way get_leaderboard does).
 */
export async function getEventLeaderboard(supabase: SupabaseClient, eventId: string) {
  const { data, error } = await supabase.rpc("get_event_leaderboard", {
    p_event_id: eventId,
  });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("not_found")) throw new Error("Event not found");
    throw error;
  }
  return data as LeaderboardResponse;
}

// ─── Friends helpers ────────────────────────────────────────────────────────

export const MAX_FRIENDS = 100;

/** True if the user still has room for another accepted friend. */
export async function hasFriendCapacity(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from("friends")
    .select("id", { count: "exact", head: true })
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq("status", "accepted");
  if (error) throw error;
  return (count ?? 0) < MAX_FRIENDS;
}

export async function createFriendRequest(
  supabase: SupabaseClient,
  userId: string,
  targetUserId: string
) {
  const { error } = await supabase
    .from("friends")
    .insert({ user_id: userId, friend_id: targetUserId, status: "pending" });
  if (error) throw error;
}

export async function acceptFriendRequest(
  supabase: SupabaseClient,
  friendshipId: string,
  userId: string
) {
  const { error } = await supabase
    .from("friends")
    .update({ status: "accepted" })
    .eq("id", friendshipId)
    .eq("friend_id", userId); // only the recipient can accept
  if (error) throw error;
}

export async function removeFriendOrDecline(
  supabase: SupabaseClient,
  friendshipId: string,
  userId: string
) {
  const { error } = await supabase
    .from("friends")
    .delete()
    .eq("id", friendshipId)
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
  if (error) throw error;
}

// ─── Buddy / favourite pokemon ──────────────────────────────────────────────

export async function setFavoritePokemon(
  supabase: SupabaseClient,
  userId: string,
  pokemonId: string | null
) {
  const { error } = await supabase
    .from("users")
    .update({ favorite_pokemon_id: pokemonId })
    .eq("id", userId);
  if (error) throw error;
}

// ─── Displayed badges ───────────────────────────────────────────────────────

/**
 * Replaces the user's displayed profile badges via the set_displayed_badges
 * RPC, which verifies every id has an achievement_unlocks row for the caller
 * (users.displayed_badges has no client UPDATE grant, so this is the only
 * write path).
 */
export async function setDisplayedBadges(supabase: SupabaseClient, badgeIds: string[]) {
  const { error } = await supabase.rpc("set_displayed_badges", { p_badge_ids: badgeIds });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("badge_not_unlocked")) throw new Error("Badge not unlocked");
    throw error;
  }
}

// ─── Privacy ────────────────────────────────────────────────────────────────

export async function updatePrivacy(
  supabase: SupabaseClient,
  userId: string,
  isPrivate: boolean
) {
  const { error } = await supabase
    .from("users")
    .update({ is_private: isPrivate })
    .eq("id", userId);
  if (error) throw error;
}

// ─── Theme ──────────────────────────────────────────────────────────────────

export async function updateTheme(
  supabase: SupabaseClient,
  userId: string,
  theme: ThemeId
) {
  const { error } = await supabase
    .from("users")
    .update({ theme })
    .eq("id", userId);
  if (error) throw error;
}

// ─── Extension preferences ──────────────────────────────────────────────────
//
// Account-level settings the extension mirrors into chrome.storage. Plain
// column updates like the ones above — the extension re-reads them, it never
// writes anything the server needs to validate.

export async function updateSoundEnabled(
  supabase: SupabaseClient,
  userId: string,
  soundEnabled: boolean
) {
  const { error } = await supabase
    .from("users")
    .update({ sound_enabled: soundEnabled })
    .eq("id", userId);
  if (error) throw error;
}

export async function updateEncounterAnimations(
  supabase: SupabaseClient,
  userId: string,
  enabled: boolean
) {
  const { error } = await supabase
    .from("users")
    .update({ encounter_animations_enabled: enabled })
    .eq("id", userId);
  if (error) throw error;
}

export async function updateBlockedSites(
  supabase: SupabaseClient,
  userId: string,
  sites: string[]
) {
  const { error } = await supabase
    .from("users")
    .update({ blocked_sites: sites })
    .eq("id", userId);
  if (error) throw error;
}

// ─── Tutorial ───────────────────────────────────────────────────────────────

export async function markTutorialSeen(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase
    .from("users")
    .update({ has_seen_tutorial: true })
    .eq("id", userId);
  if (error) throw error;
}

// ─── Achievement helpers ─────────────────────────────────────────────────────

/**
 * Claims an achievement reward for the authenticated user via the
 * claim_achievement RPC, which atomically verifies the unlock, sets
 * claimed_at, increases catch_limit, and grants a token if applicable.
 * The reward values live inside the RPC (mirroring achievements-data.ts).
 */
export async function claimAchievement(supabase: SupabaseClient, achievementId: string) {
  const { data, error } = await supabase.rpc("claim_achievement", {
    p_achievement_id: achievementId,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("already_claimed")) throw new Error("Already claimed");
    if (msg.includes("achievement_not_found")) throw new Error("Achievement not found");
    if (msg.includes("unknown_achievement")) throw new Error("Unknown achievement");
    throw error;
  }

  const result = data as {
    storage_granted: number;
    token_granted: string | null;
    token_id: string | null;
    xp_granted: number;
  };
  return {
    storageGranted: result.storage_granted,
    tokenGranted: result.token_granted,
    tokenId: result.token_id,
    xpGranted: result.xp_granted,
  };
}

/**
 * Opens a token lootbox via the redeem_token RPC, which atomically rolls the
 * encounter server-side (from the pokemon_species reference table), marks the
 * token used, and performs the catch. A failed catch (box full) rolls back
 * the token consumption, so the token survives.
 */
export async function redeemToken(supabase: SupabaseClient, tokenId: string) {
  const { data, error } = await supabase.rpc("redeem_token", {
    p_token_id: tokenId,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("not_found")) throw new Error("Token not found");
    if (msg.includes("already_used")) throw new Error("Token already used");
    if (msg.includes("type_not_selected")) throw new Error("Choose a type first");
    if (msg.includes("catch_limit_reached")) throw new Error("Box is full");
    throw error;
  }

  const result = data as {
    pokedex_number: number;
    is_shiny: boolean;
    is_new_species: boolean;
  };
  return {
    pokedexNumber: result.pokedex_number,
    isShiny: result.is_shiny,
    isNewSpecies: result.is_new_species,
  };
}

/**
 * Claims a level-up candy reward via the claim_candy_reward RPC, which
 * atomically consumes one unclaimed level slot and grants +10 candies to the
 * chosen species (must already be in the user's Pokédex).
 */
export async function claimCandyReward(supabase: SupabaseClient, pokedexNumber: number) {
  const { error } = await supabase.rpc("claim_candy_reward", {
    p_pokedex_number: pokedexNumber,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("no_pending_candy")) throw new Error("No pending candy rewards");
    if (msg.includes("species_not_unlocked")) throw new Error("Species not in Pokédex");
    throw error;
  }
}

/**
 * Sets the type_filter on a type_pick token so it can be opened.
 */
export async function selectTokenType(
  supabase: SupabaseClient,
  userId: string,
  tokenId: string,
  typeName: string
) {
  const { error } = await supabase
    .from("tokens")
    .update({ type_filter: typeName })
    .eq("id", tokenId)
    .eq("user_id", userId)
    .is("used_at", null);
  if (error) throw error;
}

// ─── Dev tools (local testing only, admin-gated) ────────────────────────────

/** Grants a token directly via dev_grant_token, bypassing the achievement claim path. */
export async function devGrantToken(
  supabase: SupabaseClient,
  tokenType: string,
  typeFilter: string | null,
  pokedexNumber: number | null
) {
  const { error } = await supabase.rpc("dev_grant_token", {
    p_token_type: tokenType,
    p_type_filter: typeFilter,
    p_pokedex_number: pokedexNumber,
  });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("not_authorized")) throw new Error("Not authorized");
    throw error;
  }
}

/** Adds XP via dev_add_xp, recomputing level with the same curve as perform_catch. */
export async function devAddXp(supabase: SupabaseClient, amount: number) {
  const { data, error } = await supabase.rpc("dev_add_xp", { p_amount: amount });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("not_authorized")) throw new Error("Not authorized");
    throw error;
  }
  return data as { xp: number; level: number };
}

/** Force-unlocks an achievement via dev_unlock_achievement, for testing the claim flow. */
export async function devUnlockAchievement(supabase: SupabaseClient, achievementId: string) {
  const { data, error } = await supabase.rpc("dev_unlock_achievement", {
    p_achievement_id: achievementId,
  });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("not_authorized")) throw new Error("Not authorized");
    throw error;
  }
  return data as string[];
}

/** Maps the shared error codes raised by the dev event RPCs to readable messages. */
function mapDevEventError(error: { message?: string }): Error | null {
  const msg = error.message ?? "";
  if (msg.includes("not_authorized")) return new Error("Not authorized");
  if (msg.includes("not_found")) return new Error("Event not found");
  if (msg.includes("invalid_window")) return new Error("Invalid event window");
  if (msg.includes("invalid_tracked_stat")) return new Error("Invalid tracked stat");
  if (msg.includes("invalid_type_filter")) return new Error("Invalid type filter");
  if (msg.includes("invalid_bonuses")) return new Error("Invalid bonuses");
  if (msg.includes("invalid_spotlight")) return new Error("Invalid spotlight");
  if (msg.includes("invalid_type_boost")) return new Error("Invalid type boost");
  if (msg.includes("invalid_generation_boost")) return new Error("Invalid generation boost");
  if (msg.includes("invalid_community_goal")) return new Error("Invalid community goal");
  if (msg.includes("invalid_reward")) return new Error("Invalid community reward");
  if (msg.includes("goal_already_reached")) {
    return new Error("Goal already reached — its scoring and reward are locked");
  }
  return null;
}

/** Messages from mapDevEventError that mean the admin sent a bad event (→ 400). */
export const DEV_EVENT_INPUT_ERRORS = new Set([
  "Invalid event window",
  "Invalid tracked stat",
  "Invalid type filter",
  "Invalid bonuses",
  "Invalid spotlight",
  "Invalid type boost",
  "Invalid generation boost",
  "Invalid community goal",
  "Invalid community reward",
]);

export interface DevEventInput {
  name: string;
  description: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  trackedStat: string;
  typeFilter: string | null;
  bonuses: unknown[];
  spotlightPokedex: number | null;
  spotlightRate: number | null;
  boostedTypes: string[];
  typeBoost: number;
  boostedGenerations: number[];
  generationBoost: number;
  communityGoal: number | null;
  rewardTokenType: string | null;
  rewardPokedex: number | null;
}

/** The RPC params shared by dev_create_event and dev_update_event. */
function devEventParams(input: DevEventInput) {
  return {
    p_name: input.name,
    p_description: input.description,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_tracked_stat: input.trackedStat,
    p_type_filter: input.typeFilter,
    p_bonuses: input.bonuses,
    p_spotlight_pokedex: input.spotlightPokedex,
    p_spotlight_rate: input.spotlightRate,
    p_boosted_types: input.boostedTypes,
    p_type_boost: input.typeBoost,
    p_boosted_generations: input.boostedGenerations,
    p_generation_boost: input.generationBoost,
    p_community_goal: input.communityGoal,
    p_reward_token_type: input.rewardTokenType,
    p_reward_pokedex: input.rewardPokedex,
  };
}

/** Creates an event via dev_create_event (admin-gated); returns the new event id. */
export async function devCreateEvent(supabase: SupabaseClient, input: DevEventInput) {
  const { data, error } = await supabase.rpc("dev_create_event", devEventParams(input));
  if (error) throw mapDevEventError(error) ?? error;
  return data as string;
}

/** Full-row event update via dev_update_event (admin-gated). */
export async function devUpdateEvent(
  supabase: SupabaseClient,
  eventId: string,
  input: DevEventInput
) {
  const { error } = await supabase.rpc("dev_update_event", {
    p_event_id: eventId,
    ...devEventParams(input),
  });
  if (error) throw mapDevEventError(error) ?? error;
}

/** Deletes an event via dev_delete_event (admin-gated); progress rows cascade. */
export async function devDeleteEvent(supabase: SupabaseClient, eventId: string) {
  const { error } = await supabase.rpc("dev_delete_event", { p_event_id: eventId });
  if (error) throw mapDevEventError(error) ?? error;
}
