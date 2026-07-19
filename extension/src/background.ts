import { CONFIG } from "./lib/config";
import { supabase } from "./lib/supabase";
import { getPokemonName } from "pokemon-data";
import { resolveTheme } from "./lib/theme";
import type { BuddyPayload, ExtensionMessage, ExternalMessage } from "./types/messages";

type StoredSession = { access_token: string; refresh_token: string };

// Server response shape of the roll_encounter RPC. Encounters are rolled and
// stored server-side (pending_encounters table) so a scripted client can't
// choose what it catches — this worker only relays the roll to the popup.
type RolledEncounter = {
  nonce: string;
  pokedex_number: number;
  is_shiny: boolean;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cached shape of the buddy (users.favorite_pokemon_id → own pokemon row),
// stored under CONFIG.BUDDY_KEY so the content script can render it on every
// page load without a Supabase round trip. buddy: null is a definitive
// "nothing to show" (logged out, no buddy set, or buddy released).
type BuddyCache = {
  pokemonId: string | null;
  buddy: BuddyPayload | null;
  fetchedAt: number;
};

function writeBuddyCache(pokemonId: string | null, buddy: BuddyPayload | null): Promise<void> {
  const cache: BuddyCache = { pokemonId, buddy, fetchedAt: Date.now() };
  return chrome.storage.local.set({ [CONFIG.BUDDY_KEY]: cache });
}

/**
 * Resolves a favorite_pokemon_id to a BuddyPayload and caches the result.
 * Only definitive outcomes are cached — a transient query failure leaves the
 * existing cache untouched and returns null.
 */
async function resolveBuddy(favoriteId: string | null): Promise<BuddyPayload | null> {
  if (!favoriteId) {
    await writeBuddyCache(null, null);
    return null;
  }

  const { data: pokemon, error } = await supabase
    .from("pokemon")
    .select("pokedex_number, is_shiny, nickname")
    .eq("id", favoriteId)
    .maybeSingle();
  if (error) return null;

  // A missing row means the buddy was released — definitively nothing.
  const buddy: BuddyPayload | null = pokemon
    ? {
        pokedexNumber: pokemon.pokedex_number,
        isShiny: pokemon.is_shiny,
        nickname: pokemon.nickname,
      }
    : null;
  await writeBuddyCache(favoriteId, buddy);
  return buddy;
}

async function fetchBuddy(userId: string): Promise<BuddyPayload | null> {
  const { data: user, error } = await supabase
    .from("users")
    .select("favorite_pokemon_id")
    .eq("id", userId)
    .single();
  if (error) return null;
  return resolveBuddy(user?.favorite_pokemon_id ?? null);
}

/**
 * Fire-and-forget refresh piggybacked on GET_SESSION's users fetch — keeps
 * the cache current for active browsers so buddy swaps made on the website
 * propagate without waiting out the TTL.
 */
async function keepBuddyCacheFresh(favoriteId: string | null): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(CONFIG.BUDDY_KEY);
    const cache = stored[CONFIG.BUDDY_KEY] as BuddyCache | undefined;
    const stale = !cache || Date.now() - cache.fetchedAt >= CONFIG.BUDDY_TTL_MS;
    if (!stale && cache.pokemonId === favoriteId) return;
    await resolveBuddy(favoriteId);
  } catch {
    // Best effort — the TTL path catches up on a later page load.
  }
}

/**
 * Restores the Supabase session from chrome.storage.local and returns the
 * authoritative user id from the JWT. Never trust a user id supplied by the
 * content script — derive it here.
 */
async function authenticate(): Promise<{ userId: string } | null> {
  const stored = await chrome.storage.local.get(CONFIG.SESSION_KEY);
  const session = stored[CONFIG.SESSION_KEY] as StoredSession | undefined;
  if (!session?.access_token || !session?.refresh_token) return null;

  const { data, error } = await supabase.auth.setSession(session);
  if (error || !data.user) return null;

  // If Supabase rotated the refresh token, persist the new pair.
  if (data.session && data.session.refresh_token !== session.refresh_token) {
    await chrome.storage.local.set({
      [CONFIG.SESSION_KEY]: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  }

  return { userId: data.user.id };
}

// Auth tokens come from the Pokebrowser web app via externally_connectable.
// Chrome enforces the origin allowlist via manifest, but we re-check sender.origin
// defensively.
const ALLOWED_WEB_ORIGINS = new Set([
  CONFIG.WEBSITE_URL,
  "https://pokebrowser.net",
  "https://www.pokebrowser.net",
]);

chrome.runtime.onMessageExternal.addListener((message: ExternalMessage, sender, sendResponse) => {
  if (!sender.origin || !ALLOWED_WEB_ORIGINS.has(sender.origin)) {
    sendResponse({ ok: false, error: "FORBIDDEN" });
    return false;
  }

  if (message?.type === "POKEBROWSE_AUTH_TOKENS") {
    const access_token = message.payload?.access_token;
    const refresh_token = message.payload?.refresh_token;
    if (
      typeof access_token !== "string" ||
      typeof refresh_token !== "string" ||
      access_token.length > 4096 ||
      refresh_token.length > 4096
    ) {
      sendResponse({ ok: false, error: "BAD_REQUEST" });
      return false;
    }
    chrome.storage.local.set({ [CONFIG.SESSION_KEY]: { access_token, refresh_token } });
    // The tokens may belong to a different account — drop the buddy cache.
    chrome.storage.local.remove(CONFIG.BUDDY_KEY);
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "POKEBROWSE_AUTH_SIGNOUT") {
    chrome.storage.local.remove([CONFIG.SESSION_KEY, CONFIG.BUDDY_KEY]);
    sendResponse({ ok: true });
    return false;
  }

  sendResponse({ ok: false, error: "UNKNOWN_TYPE" });
  return false;
});

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  // Only accept messages from our own content scripts or extension pages.
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ ok: false, error: "INVALID_SENDER" });
    return false;
  }

  if (message?.type === "GET_SESSION") {
    (async () => {
      const auth = await authenticate();
      if (!auth) {
        sendResponse({ loggedIn: false });
        return;
      }
      const { userId } = auth;

      // The encounter is rolled server-side; the RPC is "sticky" (an
      // unexpired pending encounter is returned again instead of rerolling).
      const [{ data: user }, { count: pokemonCount }, { data: roll, error: rollError }] =
        await Promise.all([
          supabase
            .from("users")
            .select("catch_limit, theme, favorite_pokemon_id")
            .eq("id", userId)
            .single(),
          supabase.from("pokemon").select("*", { count: "exact", head: true }).eq("user_id", userId),
          supabase.rpc("roll_encounter"),
        ]);

      const encounter = roll as RolledEncounter | null;
      if (rollError || !encounter) {
        console.error("roll_encounter RPC failed", rollError);
        sendResponse({ loggedIn: false });
        return;
      }

      const catchLimit = user?.catch_limit ?? CONFIG.GAME.DEFAULT_CATCH_LIMIT;
      const boxIsFull = (pokemonCount ?? 0) >= catchLimit;

      // Keep the popup's cached theme fresh — encounters happen far more
      // often than popup opens, so this piggybacks on an existing fetch.
      const theme = resolveTheme(user?.theme);
      chrome.storage.local.set({ [CONFIG.THEME_KEY]: theme });

      // Same idea for the buddy cache (only when the users row actually
      // loaded — a query error must not be cached as "no buddy").
      if (user) void keepBuddyCacheFresh(user.favorite_pokemon_id ?? null);

      const pokedexNumber = encounter.pokedex_number;

      sendResponse({
        loggedIn: true,
        boxIsFull,
        theme,
        encounter: {
          pokedexNumber,
          isShiny: encounter.is_shiny,
          name: getPokemonName(pokedexNumber),
          nonce: encounter.nonce,
        },
      });
    })();
    return true;
  }

  if (message?.type === "GET_BUDDY") {
    (async () => {
      try {
        const auth = await authenticate();
        if (!auth) {
          // Definitive: logged out. Cache it so logged-out browsing stops
          // waking this worker on every page load until the TTL expires.
          await writeBuddyCache(null, null);
          sendResponse({ buddy: null });
          return;
        }
        sendResponse({ buddy: await fetchBuddy(auth.userId) });
      } catch (err) {
        console.error("GET_BUDDY failed", err);
        sendResponse({ buddy: null });
      }
    })();
    return true;
  }

  if (message?.type === "PERFORM_CATCH") {
    (async () => {
      try {
        const auth = await authenticate();
        if (!auth) {
          sendResponse({ ok: false, error: "UNAUTHENTICATED" });
          return;
        }

        const encounterNonce = message.payload?.encounterNonce;
        if (typeof encounterNonce !== "string" || !UUID_RE.test(encounterNonce)) {
          sendResponse({ ok: false, error: "BAD_REQUEST" });
          return;
        }

        const rawCaughtOn = message.payload?.caughtOn;
        const caughtOn =
          typeof rawCaughtOn === "string" && rawCaughtOn.length <= 253 ? rawCaughtOn : null;

        // The server owns the pending encounter: perform_catch validates and
        // consumes the nonce, derives species/shiny/candy/XP from its own
        // roll, and updates stats + achievements in the same transaction.
        const { data, error } = await supabase.rpc("perform_catch", {
          p_nonce: encounterNonce,
          p_caught_on: caughtOn,
        });

        if (error) {
          if (error.message?.includes("catch_limit_reached")) {
            sendResponse({ ok: false, error: "CATCH_LIMIT_REACHED" });
            return;
          }
          if (error.message?.includes("rate_limited")) {
            sendResponse({ ok: false, error: "RATE_LIMITED" });
            return;
          }
          if (error.message?.includes("daily_limit_reached")) {
            sendResponse({ ok: false, error: "DAILY_LIMIT_REACHED" });
            return;
          }
          if (error.message?.includes("no_pending_encounter")) {
            sendResponse({ ok: false, error: "NO_PENDING_ENCOUNTER" });
            return;
          }
          if (error.message?.includes("encounter_expired")) {
            sendResponse({ ok: false, error: "ENCOUNTER_EXPIRED" });
            return;
          }
          console.error("perform_catch RPC failed", error);
          sendResponse({ ok: false, error: "INTERNAL" });
          return;
        }

        const isNewSpecies = Boolean(
          (data as { is_new_species?: boolean } | null)?.is_new_species
        );

        sendResponse({ ok: true, isNewSpecies });
      } catch (err) {
        console.error("PERFORM_CATCH failed", err);
        sendResponse({ ok: false, error: "INTERNAL" });
      }
    })();
    return true;
  }

  return false;
});
