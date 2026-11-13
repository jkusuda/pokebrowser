// Account-level prefs, cached in chrome.storage.local by the background worker during
// GET_SESSION. Only the popup's sound button writes back (hooks/useSettings.ts).
// Device-level prefs live in lib/device-prefs.ts.

export type AccountPrefs = {
  soundEnabled: boolean;
  encounterAnimations: boolean;
  /** Bare lowercase hostnames. An entry covers its subdomains. */
  blockedSites: string[];
};

export const DEFAULT_ACCOUNT_PREFS: AccountPrefs = {
  soundEnabled: true,
  encounterAnimations: true,
  blockedSites: [],
};

/** Narrows an unknown storage value to valid prefs, falling back per-field. */
export function resolveAccountPrefs(value: unknown): AccountPrefs {
  if (typeof value !== "object" || value === null) return DEFAULT_ACCOUNT_PREFS;
  const v = value as Record<string, unknown>;
  return {
    soundEnabled:
      typeof v.soundEnabled === "boolean"
        ? v.soundEnabled
        : DEFAULT_ACCOUNT_PREFS.soundEnabled,
    encounterAnimations:
      typeof v.encounterAnimations === "boolean"
        ? v.encounterAnimations
        : DEFAULT_ACCOUNT_PREFS.encounterAnimations,
    blockedSites: Array.isArray(v.blockedSites)
      ? v.blockedSites.filter((s): s is string => typeof s === "string")
      : DEFAULT_ACCOUNT_PREFS.blockedSites,
  };
}

/**
 * True when Pokebrowser should stay out of the way on this hostname.
 * An entry blocks the host itself and anything under it, so "reddit.com"
 * also covers "old.reddit.com" but not "notreddit.com".
 */
export function isBlockedHost(hostname: string, blockedSites: string[]): boolean {
  const host = hostname.toLowerCase();
  return blockedSites.some(
    (entry) => host === entry || host.endsWith(`.${entry}`)
  );
}
