// Extension sound volume — device-level, stored in chrome.storage.local
// under CONFIG.AUDIO_PREFS_KEY. Shared by the content-script sound player
// (lib/sound.ts) and the popup settings hook (hooks/useAudioPrefs.ts).
//
// volume is a 0–1 master multiplier applied on top of each sound's base
// volume. Whether sound plays at all is an account-level setting instead
// (users.sound_enabled — see lib/account-prefs.ts), so it follows the user
// between devices and can be changed from the website.

export type AudioPrefs = {
  volume: number;
};

export const DEFAULT_AUDIO_PREFS: AudioPrefs = { volume: 0.5 };

/** Narrows an unknown storage value to valid prefs, falling back per-field. */
export function resolveAudioPrefs(value: unknown): AudioPrefs {
  if (typeof value !== "object" || value === null) return DEFAULT_AUDIO_PREFS;
  const v = value as Record<string, unknown>;
  const volume =
    typeof v.volume === "number" && Number.isFinite(v.volume)
      ? Math.min(1, Math.max(0, v.volume))
      : DEFAULT_AUDIO_PREFS.volume;
  return { volume };
}
