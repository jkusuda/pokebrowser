import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { CONFIG } from "../lib/config";
import { resolveTheme, DEFAULT_THEME, type ThemeId } from "../lib/theme";
import { DEFAULT_ACCOUNT_PREFS, resolveAccountPrefs } from "../lib/account-prefs";

/**
 * The account settings the popup shows. Renders from the chrome.storage.local
 * caches first (no flash on repeat opens), then refreshes from the API and
 * re-caches. Logged out, the sound toggle no-ops.
 */
export function useSettings(userId: string | undefined) {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [soundEnabled, setSoundEnabled] = useState(DEFAULT_ACCOUNT_PREFS.soundEnabled);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cached = await chrome.storage.local.get([
          CONFIG.THEME_KEY,
          CONFIG.ACCOUNT_PREFS_KEY,
        ]);
        if (cancelled) return;
        if (cached[CONFIG.THEME_KEY]) setTheme(resolveTheme(cached[CONFIG.THEME_KEY]));
        if (cached[CONFIG.ACCOUNT_PREFS_KEY]) {
          setSoundEnabled(resolveAccountPrefs(cached[CONFIG.ACCOUNT_PREFS_KEY]).soundEnabled);
        }

        if (!userId) return;
        const { settings } = await api.status();
        if (cancelled) return;

        const freshTheme = resolveTheme(settings.theme);
        setTheme(freshTheme);
        setSoundEnabled(settings.soundEnabled);
        await chrome.storage.local.set({ [CONFIG.THEME_KEY]: freshTheme });
        await cacheSoundEnabled(settings.soundEnabled);
      } catch {
        // Keep the cached values.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // A change made on the website lands in the cache; follow it while the popup is open.
  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local" || !changes[CONFIG.ACCOUNT_PREFS_KEY]) return;
      setSoundEnabled(resolveAccountPrefs(changes[CONFIG.ACCOUNT_PREFS_KEY].newValue).soundEnabled);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const toggleSound = useCallback(async () => {
    if (!userId) return;
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      await api.updateSettings({ soundEnabled: next });
      await cacheSoundEnabled(next);
    } catch {
      setSoundEnabled(!next);
    }
  }, [soundEnabled, userId]);

  return { theme, soundEnabled, toggleSound };
}

async function cacheSoundEnabled(soundEnabled: boolean): Promise<void> {
  const stored = await chrome.storage.local.get(CONFIG.ACCOUNT_PREFS_KEY);
  const current = resolveAccountPrefs(stored[CONFIG.ACCOUNT_PREFS_KEY]);
  await chrome.storage.local.set({
    [CONFIG.ACCOUNT_PREFS_KEY]: { ...current, soundEnabled },
  });
}
