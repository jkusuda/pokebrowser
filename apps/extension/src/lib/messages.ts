import type { ThemeId } from "themes";

export type EncounterPayload = {
  pokedexNumber: number;
  isShiny: boolean;
  name: string;
  nonce: string;
};

/** The user's buddy (the profile's favorite Pokemon), resolved by the background. */
export type BuddyPayload = {
  pokedexNumber: number;
  isShiny: boolean;
  nickname: string | null;
};

/** Content script / extension pages → background. */
export type ExtensionMessage =
  | { type: "GET_SESSION" }
  | { type: "GET_BUDDY" }
  | { type: "PERFORM_CATCH"; payload: { encounterNonce: string; caughtOn?: string } };

/** Web app → background via externally_connectable. */
export type ExternalMessage =
  | { type: "POKEBROWSE_AUTH_TOKENS"; payload?: { access_token?: unknown; refresh_token?: unknown } }
  | { type: "POKEBROWSE_AUTH_SIGNOUT" }
  // Sent after a settings save so the change lands before the next GET_SESSION.
  | {
      type: "POKEBROWSE_PREFS";
      payload?: {
        soundEnabled?: unknown;
        encounterAnimations?: unknown;
        blockedSites?: unknown;
      };
    };

export type GetBuddyResponse = { buddy: BuddyPayload | null };

export type GetSessionResponse =
  | { loggedIn: false }
  // encounter is null when the server declined to spawn one; the rest is still fresh.
  // retryAfterMs is the server's cooldown before the next roll (0: next page load).
  | {
      loggedIn: true;
      boxIsFull: boolean;
      theme: ThemeId;
      encounter: EncounterPayload | null;
      retryAfterMs: number;
      encounterAnimations: boolean;
    };

export type PerformCatchError =
  | "UNAUTHENTICATED"
  | "BAD_REQUEST"
  | "NO_PENDING_ENCOUNTER"
  | "ENCOUNTER_EXPIRED"
  | "CATCH_LIMIT_REACHED"
  | "RATE_LIMITED"
  | "DAILY_LIMIT_REACHED"
  | "INVALID_SENDER"
  | "INTERNAL";

export type PerformCatchResponse =
  | { ok: true; isNewSpecies: boolean }
  | { ok: false; error: PerformCatchError };
