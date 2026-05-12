import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { CONFIG } from "../lib/config";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const result = await chrome.storage.local.get(CONFIG.SESSION_KEY);
      const session = result[CONFIG.SESSION_KEY] as
        | { access_token: string; refresh_token: string }
        | undefined;

      if (session?.access_token && session?.refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        setUser(error ? null : data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for storage changes (when background writes new tokens)
  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (CONFIG.SESSION_KEY in changes) {
        checkAuth();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [checkAuth]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await chrome.storage.local.remove(CONFIG.SESSION_KEY);
    setUser(null);
  }, []);

  const openLogin = useCallback(() => {
    chrome.tabs.create({ url: `${CONFIG.WEBSITE_URL}/login?extension=true` });
  }, []);

  return { user, loading, signOut, openLogin, refresh: checkAuth };
}