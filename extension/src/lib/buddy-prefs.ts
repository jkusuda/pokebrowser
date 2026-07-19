// Buddy display preferences — device-level, stored in chrome.storage.local
// under CONFIG.BUDDY_PREFS_KEY. Shared by the content-script overlay
// (lib/buddy.ts) and the popup settings hook (hooks/useBuddyPrefs.ts).

export type BuddyCorner = "br" | "bl";

export type BuddyPrefs = {
  visible: boolean;
  corner: BuddyCorner;
};

export const DEFAULT_BUDDY_PREFS: BuddyPrefs = { visible: true, corner: "bl" };

/** Narrows an unknown storage value to valid prefs, falling back per-field. */
export function resolveBuddyPrefs(value: unknown): BuddyPrefs {
  if (typeof value !== "object" || value === null) return DEFAULT_BUDDY_PREFS;
  const v = value as Record<string, unknown>;
  return {
    visible: typeof v.visible === "boolean" ? v.visible : DEFAULT_BUDDY_PREFS.visible,
    corner: v.corner === "bl" || v.corner === "br" ? v.corner : DEFAULT_BUDDY_PREFS.corner,
  };
}
