import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "./config";

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Extension manages sessions via chrome.storage.local
    autoRefreshToken: true, // Allow setSession to refresh expired access tokens
    detectSessionInUrl: false,
  },
});
