// Extension sound preferences — device-level, stored in chrome.storage.local
// under CONFIG.AUDIO_PREFS_KEY. Shared by the content-script sound player
// (lib/sound.ts) and the popup settings hook (hooks/useAudioPrefs.ts).
//
// volume is a 0–1 master multiplier applied on top of each sound's base
// volume; muted silences everything regardless of volume.

export type AudioPrefs = {
  volume: number;
  muted: boolean;
};

export const DEFAULT_AUDIO_PREFS: AudioPrefs = { volume: 0.5, muted: false };

/** Narrows an unknown storage value to valid prefs, falling back per-field. */
export function resolveAudioPrefs(value: unknown): AudioPrefs {
  if (typeof value !== "object" || value === null) return DEFAULT_AUDIO_PREFS;
  const v = value as Record<string, unknown>;
  const volume =
    typeof v.volume === "number" && Number.isFinite(v.volume)
      ? Math.min(1, Math.max(0, v.volume))
      : DEFAULT_AUDIO_PREFS.volume;
  return {
    volume,
    muted: typeof v.muted === "boolean" ? v.muted : DEFAULT_AUDIO_PREFS.muted,
  };
}
