import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { CONFIG } from "../lib/config";
import {
  DEFAULT_ACCOUNT_PREFS,
  resolveAccountPrefs,
} from "../lib/account-prefs";

/**
 * The account-level sound switch (`users.sound_enabled`), shared with the
 * website's settings page. Mirrors useTheme: render from the
 * chrome.storage.local cache immediately (no flash on repeat opens), then
 * refresh from Supabase and re-cache.
 *
 * Unlike useTheme this also writes — the popup's sound button is the one place
 * the extension updates the column. The cache is updated alongside it so open
 * tabs pick the change up through chrome.storage.onChanged (lib/sound.ts)
 * without waiting for the next GET_SESSION.
 *
 * Logged out, the setter no-ops rather than writing a cache value the server
 * would immediately contradict.
 */
export function useSoundEnabled(userId: string | undefined) {
  const [enabled, setEnabled] = useState(DEFAULT_ACCOUNT_PREFS.soundEnabled);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cached = await chrome.storage.local.get(CONFIG.ACCOUNT_PREFS_KEY);
        if (!cancelled && cached[CONFIG.ACCOUNT_PREFS_KEY]) {
          setEnabled(resolveAccountPrefs(cached[CONFIG.ACCOUNT_PREFS_KEY]).soundEnabled);
        }

        if (!userId) return;
        const { data, error } = await supabase
          .from("users")
          .select("sound_enabled")
          .eq("id", userId)
          .single();
        if (cancelled || error) return;

        const fresh = data?.sound_enabled !== false;
        setEnabled(fresh);
        await writeCache(fresh);
      } catch {
        // Keep whatever value we already have.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Follow the cache while the popup is open, so a change made on the website
  // (which posts POKEBROWSE_PREFS, and which the background also re-reads on
  // every GET_SESSION) moves this button without needing a reopen.
  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local" || !changes[CONFIG.ACCOUNT_PREFS_KEY]) return;
      setEnabled(resolveAccountPrefs(changes[CONFIG.ACCOUNT_PREFS_KEY].newValue).soundEnabled);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const toggle = useCallback(async () => {
    if (!userId) return;
    const next = !enabled;
    setEnabled(next);
    try {
      const { error } = await supabase
        .from("users")
        .update({ sound_enabled: next })
        .eq("id", userId);
      if (error) throw error;
      await writeCache(next);
    } catch {
      setEnabled(!next); // Roll back so the button matches the server.
    }
  }, [enabled, userId]);

  return { soundEnabled: enabled, toggleSound: toggle };
}

/** Merges one field into the cached account prefs without clobbering the rest. */
async function writeCache(soundEnabled: boolean): Promise<void> {
  const stored = await chrome.storage.local.get(CONFIG.ACCOUNT_PREFS_KEY);
  const current = resolveAccountPrefs(stored[CONFIG.ACCOUNT_PREFS_KEY]);
  await chrome.storage.local.set({
    [CONFIG.ACCOUNT_PREFS_KEY]: { ...current, soundEnabled },
  });
}
