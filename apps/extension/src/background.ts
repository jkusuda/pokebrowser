import { CONFIG } from "./lib/config";
import { ApiError, type Pokemon } from "api-client";
import { api } from "./lib/api";
import { supabase } from "./lib/supabase";
import { getPokemonName } from "pokemon-data";
import { resolveTheme } from "./lib/theme";
import { resolveAccountPrefs, type AccountPrefs } from "./lib/account-prefs";
import { clearSession } from "./lib/session";
import { handleInstalled, restoreBadge } from "./lib/update-notice";
import type {
  BuddyPayload,
  ExtensionMessage,
  ExternalMessage,
  PerformCatchError,
} from "./lib/messages";

type StoredSession = { access_token: string; refresh_token: string };

const CATCH_ERRORS: Record<string, PerformCatchError> = {
  catch_limit_reached: "CATCH_LIMIT_REACHED",
  rate_limited: "RATE_LIMITED",
  daily_limit_reached: "DAILY_LIMIT_REACHED",
  no_pending_encounter: "NO_PENDING_ENCOUNTER",
  encounter_expired: "ENCOUNTER_EXPIRED",
};

// Cached under CONFIG.BUDDY_KEY so the content script renders without a round trip; buddy: null means nothing to show.
type BuddyCache = {
  pokemonId: string | null;
  buddy: BuddyPayload | null;
  fetchedAt: number;
};

function toBuddyPayload(pokemon: Pokemon | null): BuddyPayload | null {
  return pokemon && {
    pokedexNumber: pokemon.pokedexNumber,
    isShiny: pokemon.isShiny,
    nickname: pokemon.nickname,
  };
}

function writeBuddyCache(pokemonId: string | null, buddy: BuddyPayload | null): Promise<void> {
  const cache: BuddyCache = { pokemonId, buddy, fetchedAt: Date.now() };
  return chrome.storage.local.set({ [CONFIG.BUDDY_KEY]: cache });
}

/** Refreshes the buddy cache when it is stale or points at a different Pokemon. */
async function keepBuddyCacheFresh(pokemon: Pokemon | null): Promise<void> {
  try {
    const pokemonId = pokemon?.id ?? null;
    const stored = await chrome.storage.local.get(CONFIG.BUDDY_KEY);
    const cache = stored[CONFIG.BUDDY_KEY] as BuddyCache | undefined;
    const stale = !cache || Date.now() - cache.fetchedAt >= CONFIG.BUDDY_TTL_MS;
    if (!stale && cache.pokemonId === pokemonId) return;
    await writeBuddyCache(pokemonId, toBuddyPayload(pokemon));
  } catch {
    // Best effort; the TTL catches up.
  }
}

/** Restores the Supabase session from chrome.storage.local so api calls carry a fresh token. */
async function authenticate(): Promise<boolean> {
  const stored = await chrome.storage.local.get(CONFIG.SESSION_KEY);
  const session = stored[CONFIG.SESSION_KEY] as StoredSession | undefined;
  if (!session?.access_token || !session?.refresh_token) return false;

  const { data, error } = await supabase.auth.setSession(session);
  if (error || !data.user) return false;

  // If Supabase rotated the refresh token, persist the new pair.
  if (data.session && data.session.refresh_token !== session.refresh_token) {
    await chrome.storage.local.set({
      [CONFIG.SESSION_KEY]: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  }

  return true;
}

// Listeners must be registered synchronously at the top level to wake the service worker.
chrome.runtime.onInstalled.addListener((details) => {
  void handleInstalled(details);
});

chrome.runtime.onStartup.addListener(() => {
  void restoreBadge();
});

// Chrome enforces the manifest's externally_connectable origins; sender.origin is re-checked here.
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
    void clearSession();
    sendResponse({ ok: true });
    return false;
  }

  // Only a freshness shortcut (GET_SESSION re-reads the settings): merge what the page sent over the cache.
  if (message?.type === "POKEBROWSE_PREFS") {
    (async () => {
      const stored = await chrome.storage.local.get(CONFIG.ACCOUNT_PREFS_KEY);
      const current = resolveAccountPrefs(stored[CONFIG.ACCOUNT_PREFS_KEY]);
      const p = message.payload ?? {};
      const next: AccountPrefs = {
        soundEnabled:
          typeof p.soundEnabled === "boolean" ? p.soundEnabled : current.soundEnabled,
        encounterAnimations:
          typeof p.encounterAnimations === "boolean"
            ? p.encounterAnimations
            : current.encounterAnimations,
        blockedSites: Array.isArray(p.blockedSites)
          ? p.blockedSites.filter((s): s is string => typeof s === "string")
          : current.blockedSites,
      };
      await chrome.storage.local.set({ [CONFIG.ACCOUNT_PREFS_KEY]: next });
      sendResponse({ ok: true });
    })();
    return true;
  }

  sendResponse({ ok: false, error: "UNKNOWN_TYPE" });
  return false;
});

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ ok: false, error: "INVALID_SENDER" });
    return false;
  }

  if (message?.type === "GET_SESSION") {
    (async () => {
      if (!(await authenticate())) {
        sendResponse({ loggedIn: false });
        return;
      }

      let roll;
      try {
        roll = await api.roll();
      } catch (err) {
        console.error("roll failed", err);
        sendResponse({ loggedIn: false });
        return;
      }
      const { encounter, settings, buddy } = roll;
      const retryAfterMs = roll.retryAfterMs;
      const boxIsFull = roll.boxCount >= roll.catchLimit;

      // The theme, account prefs and buddy caches piggyback on this far more frequent call.
      const theme = resolveTheme(settings.theme);
      const accountPrefs = resolveAccountPrefs({
        soundEnabled: settings.soundEnabled,
        encounterAnimations: settings.encounterAnimationsEnabled,
        blockedSites: settings.blockedSites,
      });
      chrome.storage.local.set({
        [CONFIG.THEME_KEY]: theme,
        [CONFIG.ACCOUNT_PREFS_KEY]: accountPrefs,
      });
      void keepBuddyCacheFresh(buddy);

      sendResponse({
        loggedIn: true,
        boxIsFull,
        theme,
        retryAfterMs,
        encounterAnimations: accountPrefs.encounterAnimations,
        encounter: encounter && {
          pokedexNumber: encounter.pokedexNumber,
          isShiny: encounter.isShiny,
          name: getPokemonName(encounter.pokedexNumber),
          nonce: encounter.nonce,
        },
      });
    })();
    return true;
  }

  if (message?.type === "GET_BUDDY") {
    (async () => {
      try {
        if (!(await authenticate())) {
          // Cache the logged-out state so page loads stop waking the worker.
          await writeBuddyCache(null, null);
          sendResponse({ buddy: null });
          return;
        }
        const { buddy } = await api.status();
        const payload = toBuddyPayload(buddy);
        await writeBuddyCache(buddy?.id ?? null, payload);
        sendResponse({ buddy: payload });
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
        if (!(await authenticate())) {
          sendResponse({ ok: false, error: "UNAUTHENTICATED" });
          return;
        }

        const encounterNonce = message.payload?.encounterNonce;
        if (typeof encounterNonce !== "string") {
          sendResponse({ ok: false, error: "BAD_REQUEST" });
          return;
        }

        const rawCaughtOn = message.payload?.caughtOn;
        const caughtOn = typeof rawCaughtOn === "string" ? rawCaughtOn : null;

        try {
          const result = await api.catchPokemon(encounterNonce, caughtOn);
          sendResponse({ ok: true, isNewSpecies: result.isNewSpecies });
        } catch (err) {
          const known = err instanceof ApiError ? CATCH_ERRORS[err.code] : undefined;
          if (!known) console.error("catch failed", err);
          sendResponse({ ok: false, error: known ?? "INTERNAL" });
        }
      } catch (err) {
        console.error("PERFORM_CATCH failed", err);
        sendResponse({ ok: false, error: "INTERNAL" });
      }
    })();
    return true;
  }

  return false;
});
