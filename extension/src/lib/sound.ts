// Content-script sound player. All extension sounds (encounter cry, buddy
// cry, catch jingle) route through playSound so the popup's audio prefs
// (volume slider + mute) apply everywhere.
//
// Statically imported by content.ts/buddy.ts, so the second Vite pass still
// inlines it into the fully-bundled content.js IIFE.

import { CONFIG } from "./config";
import { DEFAULT_AUDIO_PREFS, resolveAudioPrefs, type AudioPrefs } from "./audio-prefs";

let prefs: AudioPrefs = DEFAULT_AUDIO_PREFS;
let initialized = false;

/** Loads audio prefs and follows live changes. Called once per page load. */
export function initSound(): void {
  if (initialized) return;
  initialized = true;
  try {
    void chrome.storage.local.get(CONFIG.AUDIO_PREFS_KEY).then((stored) => {
      prefs = resolveAudioPrefs(stored[CONFIG.AUDIO_PREFS_KEY]);
    });
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[CONFIG.AUDIO_PREFS_KEY]) return;
      prefs = resolveAudioPrefs(changes[CONFIG.AUDIO_PREFS_KEY].newValue);
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
  if (prefs.muted || prefs.volume === 0) return;
  try {
    const audio = new Audio(url);
    audio.volume = Math.min(1, baseVolume * prefs.volume);
    void audio.play().catch(() => {});
  } catch {
    // Audio unavailable — stay silent.
  }
}
