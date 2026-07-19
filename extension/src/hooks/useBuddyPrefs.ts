import { useState, useEffect, useCallback } from "react";
import { CONFIG } from "../lib/config";
import {
  DEFAULT_BUDDY_PREFS,
  resolveBuddyPrefs,
  type BuddyPrefs,
} from "../lib/buddy-prefs";

/**
 * The buddy display preferences (device-level, chrome.storage.local).
 * Writes propagate to open tabs via chrome.storage.onChanged, which the
 * content-script overlay (lib/buddy.ts) subscribes to.
 */
export function useBuddyPrefs() {
  const [prefs, setPrefs] = useState<BuddyPrefs>(DEFAULT_BUDDY_PREFS);

  useEffect(() => {
    let cancelled = false;
    chrome.storage.local
      .get(CONFIG.BUDDY_PREFS_KEY)
      .then((stored) => {
        if (!cancelled) setPrefs(resolveBuddyPrefs(stored[CONFIG.BUDDY_PREFS_KEY]));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((next: BuddyPrefs) => {
    setPrefs(next);
    void chrome.storage.local.set({ [CONFIG.BUDDY_PREFS_KEY]: next });
  }, []);

  const toggleVisible = useCallback(
    () => update({ ...prefs, visible: !prefs.visible }),
    [prefs, update]
  );

  const moveCorner = useCallback(
    () => update({ ...prefs, corner: prefs.corner === "br" ? "bl" : "br" }),
    [prefs, update]
  );

  return { prefs, toggleVisible, moveCorner };
}
