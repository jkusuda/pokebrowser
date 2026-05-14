import { CONFIG } from "./lib/config";
import { supabase } from "./lib/supabase";
import { getPokemonBaseXp, getFamilyId, getPokemonName, getRandomPokemonId, getPokemonsByGeneration, getPokemonData } from "pokemon-data";

type StoredSession = { access_token: string; refresh_token: string };
type PendingEncounter = {
  nonce: string;
  pokedexNumber: number;
  isShiny: boolean;
  name: string;
  createdAt: number;
  tokenId?: string;
};

// Gen 1 legendary Pokémon ids
const LEGENDARY_IDS = new Set([144, 145, 146, 150, 151]);

/** Pick a random id from an array of Gen 1 Pokémon ids. */
function pickRandom(ids: number[]): number {
  return ids[Math.floor(Math.random() * ids.length)];
}

/** Return all Gen 1 Pokémon ids whose types include typeName. */
function gen1IdsByType(typeName: string): number[] {
  return getPokemonsByGeneration(1)
    .filter((p) => p.types.includes(typeName.toLowerCase()))
    .map((p) => p.id);
}

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

      const [{ data: user }, { count: pokemonCount }, { data: activeToken }] = await Promise.all([
        supabase.from("users").select("catch_limit").eq("id", userId).single(),
        supabase.from("pokemon").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase
          .from("tokens")
          .select("*")
          .eq("user_id", userId)
          .is("used_at", null)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      const catchLimit = user?.catch_limit ?? CONFIG.GAME.DEFAULT_CATCH_LIMIT;
      const boxIsFull = (pokemonCount ?? 0) >= catchLimit;

      // Roll encounter — use token if available
      let pokedexNumber: number;
      let isShiny: boolean;
      let usedTokenId: string | undefined;

      const token = activeToken as { id: string; token_type: string; type_filter: string | null } | null;

      if (token) {
        switch (token.token_type) {
          case "legendary":
            pokedexNumber = pickRandom([...LEGENDARY_IDS]);
            isShiny = Math.random() < CONFIG.GAME.SHINY_RATE;
            usedTokenId = token.id;
            break;
          case "mythical":
            pokedexNumber = 151; // Mew
            isShiny = Math.random() < CONFIG.GAME.SHINY_RATE;
            usedTokenId = token.id;
            break;
          case "shiny":
            pokedexNumber = getRandomPokemonId(CONFIG.GAME.CURRENT_GENERATION);
            isShiny = true;
            usedTokenId = token.id;
            break;
          case "type_pick":
            if (token.type_filter) {
              const ids = gen1IdsByType(token.type_filter);
              pokedexNumber = ids.length > 0
                ? pickRandom(ids)
                : getRandomPokemonId(CONFIG.GAME.CURRENT_GENERATION);
              isShiny = Math.random() < CONFIG.GAME.SHINY_RATE;
              usedTokenId = token.id;
            } else {
              // type not chosen yet — fall through to normal roll
              pokedexNumber = getRandomPokemonId(CONFIG.GAME.CURRENT_GENERATION);
              isShiny = Math.random() < CONFIG.GAME.SHINY_RATE;
            }
            break;
          default:
            pokedexNumber = getRandomPokemonId(CONFIG.GAME.CURRENT_GENERATION);
            isShiny = Math.random() < CONFIG.GAME.SHINY_RATE;
        }
      } else {
        pokedexNumber = getRandomPokemonId(CONFIG.GAME.CURRENT_GENERATION);
        isShiny = Math.random() < CONFIG.GAME.SHINY_RATE;
      }

      const name = getPokemonName(pokedexNumber);
      const nonce = crypto.randomUUID();

      const pending: PendingEncounter = {
        nonce,
        pokedexNumber,
        isShiny,
        name,
        createdAt: Date.now(),
        tokenId: usedTokenId,
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

        // Determine catch metadata for stat tracking
        const pokemonData = getPokemonData(pokedexNumber);
        const isLegendary = LEGENDARY_IDS.has(pokedexNumber);
        const types: string[] = pokemonData?.types ?? [];

        // Fire stat update + achievement checks in background (non-blocking)
        supabase
          .rpc("update_catch_stats", {
            p_is_shiny: isShiny,
            p_is_legendary: isLegendary,
            p_types: types,
            p_caught_on: caughtOn,
          })
          .then(({ error: statsError }) => {
            if (statsError) {
              console.warn("update_catch_stats failed (non-fatal):", statsError);
            }
          });

        // Mark token as used if one was consumed in this encounter
        if (pending.tokenId) {
          supabase
            .from("tokens")
            .update({ used_at: new Date().toISOString() })
            .eq("id", pending.tokenId)
            .eq("user_id", userId)
            .then(({ error: tokenError }) => {
              if (tokenError) console.warn("Token mark-used failed (non-fatal):", tokenError);
            });
        }

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
