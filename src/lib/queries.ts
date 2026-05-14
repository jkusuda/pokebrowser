import { SupabaseClient } from "@supabase/supabase-js";
import { User, Pokemon, Friend, FriendWithUser, IncomingRequest, PokedexUnlock, Candy, AchievementUnlock, Token, UserStats } from "@/types";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements-data";

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

  // ── Step 4: resolve buddy pokemon if set ──────────────────────────────────
  const user = profileResult.data as User;
  const favoritePokemon = user.favorite_pokemon_id
    ? ((await supabase.from("pokemon").select("*").eq("id", user.favorite_pokemon_id).single()).data as Pokemon)
    : null;

  return {
    user,
    pokemon: (pokemonResult.data as Pokemon[]) ?? [],
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

// ─── Friends helpers ────────────────────────────────────────────────────────

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

// ─── Achievement helpers ─────────────────────────────────────────────────────

/**
 * Claims an achievement reward for the authenticated user.
 * Sets claimed_at, increases catch_limit, and grants a token if applicable.
 */
export async function claimAchievement(
  supabase: SupabaseClient,
  userId: string,
  achievementId: string
) {
  // Verify the unlock exists and is unclaimed
  const { data: unlock, error: unlockError } = await supabase
    .from("achievement_unlocks")
    .select("id, claimed_at")
    .eq("user_id", userId)
    .eq("achievement_id", achievementId)
    .single();

  if (unlockError || !unlock) throw new Error("Achievement not found");
  if (unlock.claimed_at) throw new Error("Already claimed");

  const def = ACHIEVEMENT_BY_ID[achievementId];
  if (!def) throw new Error("Unknown achievement");

  // Mark as claimed
  const { error: claimError } = await supabase
    .from("achievement_unlocks")
    .update({ claimed_at: new Date().toISOString() })
    .eq("id", unlock.id);
  if (claimError) throw claimError;

  // Apply storage reward
  if (def.storageReward > 0) {
    const { error: storageError } = await supabase.rpc("increment_catch_limit", {
      p_user_id: userId,
      p_amount: def.storageReward,
    });
    if (storageError) throw storageError;
  }

  // Grant token reward
  if (def.tokenReward) {
    const { error: tokenError } = await supabase.from("tokens").insert({
      user_id: userId,
      token_type: def.tokenReward,
      type_filter: null,
    });
    if (tokenError) throw tokenError;
  }

  return { storageGranted: def.storageReward, tokenGranted: def.tokenReward };
}

/**
 * Claims a level-up candy reward: grants 10 candies to the chosen Pokémon family
 * and decrements unclaimed_candy_levels.
 */
export async function claimCandyReward(
  supabase: SupabaseClient,
  userId: string,
  pokedexNumber: number
) {
  // Read current level count and verify > 0
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("unclaimed_candy_levels")
    .eq("id", userId)
    .single();

  if (userError || !user) throw new Error("User not found");
  const currentLevels = (user as { unclaimed_candy_levels: number }).unclaimed_candy_levels;
  if (currentLevels < 1) throw new Error("No pending candy rewards");

  // Verify user has caught this species
  const { data: unlock } = await supabase
    .from("pokedex")
    .select("pokedex_number")
    .eq("user_id", userId)
    .eq("pokedex_number", pokedexNumber)
    .single();

  if (!unlock) throw new Error("Species not in Pokédex");

  // Atomically decrement using an optimistic lock: only succeeds if unclaimed_candy_levels
  // hasn't changed between the read above and this write (prevents double-claiming).
  const { data: decremented, error: levelError } = await supabase
    .from("users")
    .update({ unclaimed_candy_levels: currentLevels - 1 })
    .eq("id", userId)
    .eq("unclaimed_candy_levels", currentLevels)
    .select("id");

  if (levelError) throw levelError;
  if (!decremented?.length) throw new Error("No pending candy rewards");

  // Grant the candies now that the level slot is consumed
  const { error: candyError } = await supabase.rpc("increment_candy", {
    p_user_id: userId,
    p_pokedex_number: pokedexNumber,
    p_amount: 10,
  });
  if (candyError) throw candyError;
}

/**
 * Sets the type_filter on a type_pick token so the extension can use it.
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
