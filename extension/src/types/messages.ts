// Single source of truth for the messages exchanged between the content
// script and the background service worker, plus the external auth messages
// sent by the web app via externally_connectable.

import type { ThemeId } from "shared-types";

export type EncounterPayload = {
  pokedexNumber: number;
  isShiny: boolean;
  name: string;
  nonce: string;
};

/** The user's buddy (users.favorite_pokemon_id), resolved by the background. */
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
  | { type: "POKEBROWSE_AUTH_SIGNOUT" };

export type ExternalResponse =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "BAD_REQUEST" | "UNKNOWN_TYPE" };

export type GetBuddyResponse = { buddy: BuddyPayload | null };

export type GetSessionResponse =
  | { loggedIn: false }
  | { loggedIn: true; boxIsFull: boolean; theme: ThemeId; encounter: EncounterPayload };

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
