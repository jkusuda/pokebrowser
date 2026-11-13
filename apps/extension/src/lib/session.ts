import { CONFIG } from "./config";

/** Drops the session and everything cached for that account. */
export function clearSession(): Promise<void> {
  return chrome.storage.local.remove([
    CONFIG.SESSION_KEY,
    CONFIG.BUDDY_KEY,
    CONFIG.ACCOUNT_PREFS_KEY,
  ]);
}
