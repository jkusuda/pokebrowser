"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { postToExtension as post } from "@/lib/extension-bridge";

/**
 * Invisible component that bridges Supabase auth state to the Chrome extension.
 *
 * Delivery details (ID list, broadcast, error swallowing) live in
 * @/lib/extension-bridge, which the settings page also uses. Messages go over
 * chrome.runtime.sendMessage rather than DOM postMessage: the extension's
 * manifest declares this origin in `externally_connectable.matches` and Chrome
 * enforces that allowlist at the runtime layer, so no in-page content script is
 * needed and other code on the page can't intercept the token.
 *
 * If no extension ID is configured or none is installed, this no-ops silently —
 * the web app still works on its own.
 */
export default function ExtensionAuthBridge() {
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          post({
            type: "POKEBROWSE_AUTH_TOKENS",
            payload: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            },
          });
        } else {
          post({ type: "POKEBROWSE_AUTH_SIGNOUT" });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
