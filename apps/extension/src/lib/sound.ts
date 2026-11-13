// Content-script sound player. Every sound goes through playSound, so both switches apply:
// soundEnabled (account, lib/account-prefs.ts) and volume (device, lib/device-prefs.ts).

import { CONFIG } from "./config";
import { DEFAULT_AUDIO_PREFS, resolveAudioPrefs, type AudioPrefs } from "./device-prefs";
import {
  DEFAULT_ACCOUNT_PREFS,
  resolveAccountPrefs,
  type AccountPrefs,
} from "./account-prefs";

let prefs: AudioPrefs = DEFAULT_AUDIO_PREFS;
let account: AccountPrefs = DEFAULT_ACCOUNT_PREFS;
let initialized = false;

/** Loads sound prefs and follows live changes. Called once per page load. */
export function initSound(): void {
  if (initialized) return;
  initialized = true;
  try {
    void chrome.storage.local
      .get([CONFIG.AUDIO_PREFS_KEY, CONFIG.ACCOUNT_PREFS_KEY])
      .then((stored) => {
        prefs = resolveAudioPrefs(stored[CONFIG.AUDIO_PREFS_KEY]);
        account = resolveAccountPrefs(stored[CONFIG.ACCOUNT_PREFS_KEY]);
      });
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      if (changes[CONFIG.AUDIO_PREFS_KEY]) {
        prefs = resolveAudioPrefs(changes[CONFIG.AUDIO_PREFS_KEY].newValue);
      }
      if (changes[CONFIG.ACCOUNT_PREFS_KEY]) {
        account = resolveAccountPrefs(changes[CONFIG.ACCOUNT_PREFS_KEY].newValue);
      }
    });
  } catch {
    // Extension context invalidated — keep defaults.
  }
}

/**
 * Best-effort playback: Chrome's autoplay policy blocks sound until the user
 * has interacted with the page, and strict page CSP can block the source —
 * in both cases we just stay silent.
 */
export function playSound(url: string, baseVolume: number): void {
  if (!account.soundEnabled || prefs.volume === 0) return;
  try {
    const audio = new Audio(url);
    audio.volume = Math.min(1, baseVolume * prefs.volume);
    void audio.play().catch(() => {});
  } catch {
    // Audio unavailable — stay silent.
  }
}
