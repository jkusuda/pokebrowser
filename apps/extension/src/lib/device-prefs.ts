export type AudioPrefs = {
  volume: number;
};

type BuddyCorner = "br" | "bl";

export type BuddyPrefs = {
  visible: boolean;
  corner: BuddyCorner;
};

export const DEFAULT_AUDIO_PREFS: AudioPrefs = { volume: 0.5 };
export const DEFAULT_BUDDY_PREFS: BuddyPrefs = { visible: true, corner: "bl" };

export function resolveAudioPrefs(value: unknown): AudioPrefs {
  if (typeof value !== "object" || value === null) return DEFAULT_AUDIO_PREFS;
  const v = value as Record<string, unknown>;
  const volume =
    typeof v.volume === "number" && Number.isFinite(v.volume)
      ? Math.min(1, Math.max(0, v.volume))
      : DEFAULT_AUDIO_PREFS.volume;
  return { volume };
}

export function resolveBuddyPrefs(value: unknown): BuddyPrefs {
  if (typeof value !== "object" || value === null) return DEFAULT_BUDDY_PREFS;
  const v = value as Record<string, unknown>;
  return {
    visible: typeof v.visible === "boolean" ? v.visible : DEFAULT_BUDDY_PREFS.visible,
    corner: v.corner === "bl" || v.corner === "br" ? v.corner : DEFAULT_BUDDY_PREFS.corner,
  };
}
