import { CONFIG } from "./lib/config";
import { supabase } from "./lib/supabase";
import { getPokemonBaseXp, getFamilyId, getPokemonName, getRandomPokemonId } from "pokemon-data";

type StoredSession = { access_token: string; refresh_token: string };
type PendingEncounter = {
  nonce: string;
  pokedexNumber: number;
  isShiny: boolean;
  name: string;
  createdAt: number;
};

const PENDING_PREFIX = "pb_enc_";
const pendingKey = (userId: string) => `${PENDING_PREFIX}${userId}`;

const LAST_CATCH_PREFIX = "pb_lastcatch_";
const lastCatchKey = (userId: string) => `${LAST_CATCH_PREFIX}${userId}`;

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
  "https://pokebrowser.app",
]);

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
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
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "POKEBROWSE_AUTH_SIGNOUT") {
    chrome.storage.local.remove(CONFIG.SESSION_KEY);
    sendResponse({ ok: true });
    return false;
  }

  sendResponse({ ok: false, error: "UNKNOWN_TYPE" });
  return false;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

      const [{ data: user }, { count: pokemonCount }] = await Promise.all([
        supabase.from("users").select("catch_limit").eq("id", userId).single(),
        supabase.from("pokemon").select("*", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      const catchLimit = user?.catch_limit ?? CONFIG.GAME.DEFAULT_CATCH_LIMIT;
      const boxIsFull = (pokemonCount ?? 0) >= catchLimit;

      const pokedexNumber = getRandomPokemonId(CONFIG.GAME.CURRENT_GENERATION);
      const isShiny = Math.random() < CONFIG.GAME.SHINY_RATE;
      const name = getPokemonName(pokedexNumber);
      const nonce = crypto.randomUUID();

      const pending: PendingEncounter = {
        nonce,
        pokedexNumber,
        isShiny,
        name,
        createdAt: Date.now(),
      };
      await chrome.storage.session.set({ [pendingKey(userId)]: pending });

      sendResponse({
        loggedIn: true,
        boxIsFull,
        encounter: { pokedexNumber, isShiny, name, nonce },
      });
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
        const { userId } = auth;

        const encounterNonce = message.payload?.encounterNonce;
        if (typeof encounterNonce !== "string" || encounterNonce.length > 64) {
          sendResponse({ ok: false, error: "BAD_REQUEST" });
          return;
        }

        const rawCaughtOn = message.payload?.caughtOn;
        const caughtOn =
          typeof rawCaughtOn === "string" && rawCaughtOn.length <= 253 ? rawCaughtOn : null;

        // Look up — and consume — the server-rolled encounter.
        const key = pendingKey(userId);
        const stored = await chrome.storage.session.get(key);
        const pending = stored[key] as PendingEncounter | undefined;
        if (!pending || pending.nonce !== encounterNonce) {
          sendResponse({ ok: false, error: "NO_PENDING_ENCOUNTER" });
          return;
        }
        if (Date.now() - pending.createdAt > CONFIG.GAME.PENDING_ENCOUNTER_TTL_MS) {
          await chrome.storage.session.remove(key);
          sendResponse({ ok: false, error: "ENCOUNTER_EXPIRED" });
          return;
        }

        // Rate-limit check happens after nonce validation so a malicious page
        // spamming bad nonces can't trigger a cooldown for the real user.
        const rateKey = lastCatchKey(userId);
        const rateStored = await chrome.storage.session.get(rateKey);
        const lastAt = (rateStored[rateKey] as number | undefined) ?? 0;
        if (Date.now() - lastAt < CONFIG.GAME.CATCH_COOLDOWN_MS) {
          sendResponse({ ok: false, error: "RATE_LIMITED" });
          return;
        }

        // Single-use: consume the nonce before doing any writes.
        await chrome.storage.session.remove(key);

        const { pokedexNumber, isShiny, name } = pending;
        const familyBaseId = getFamilyId(pokedexNumber);
        const xpGained = getPokemonBaseXp(pokedexNumber, isShiny);

        const { data, error } = await supabase.rpc("perform_catch", {
          p_pokedex_number: pokedexNumber,
          p_is_shiny: isShiny,
          p_family_base_id: familyBaseId,
          p_xp_gained: xpGained,
          p_nickname: name,
          p_caught_on: caughtOn,
        });

        if (error) {
          if (error.message?.includes("catch_limit_reached")) {
            sendResponse({ ok: false, error: "CATCH_LIMIT_REACHED" });
            return;
          }
          console.error("perform_catch RPC failed", error);
          sendResponse({ ok: false, error: "INTERNAL" });
          return;
        }

        // Update cooldown only on a successful catch.
        await chrome.storage.session.set({ [rateKey]: Date.now() });

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
