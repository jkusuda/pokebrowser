import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { CONFIG } from "../lib/config";
import { resolveTheme, DEFAULT_THEME, type ThemeId } from "../lib/theme";

/**
 * The user's website theme preference (`users.theme`). Renders from the
 * chrome.storage.local cache immediately (no flash on repeat opens), then
 * refreshes from Supabase and re-caches. Falls back to the default theme
 * when logged out or on any failure.
 */
export function useTheme(userId: string | undefined): ThemeId {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cached = await chrome.storage.local.get(CONFIG.THEME_KEY);
        if (!cancelled && cached[CONFIG.THEME_KEY]) {
          setTheme(resolveTheme(cached[CONFIG.THEME_KEY]));
        }

        if (!userId) return;
        const { data, error } = await supabase
          .from("users")
          .select("theme")
          .eq("id", userId)
          .single();
        if (cancelled || error) return;

        const fresh = resolveTheme(data?.theme);
        setTheme(fresh);
        await chrome.storage.local.set({ [CONFIG.THEME_KEY]: fresh });
      } catch {
        // Keep whatever theme we already have.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return theme;
}
