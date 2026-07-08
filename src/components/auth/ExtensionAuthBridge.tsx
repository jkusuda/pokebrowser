"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Invisible component that bridges Supabase auth state to the Chrome extension.
 *
 * Uses chrome.runtime.sendMessage with the extension's ID rather than DOM
 * postMessage. The extension's manifest declares this origin in
 * `externally_connectable.matches`, and Chrome enforces the origin allowlist
 * at the runtime layer — no in-page content script needed, and no risk of
 * other code on the page intercepting the token.
 *
 * NEXT_PUBLIC_POKEBROWSE_EXTENSION_ID may be a comma-separated list of IDs so
 * one deployment can serve several installs (the Web Store build plus unpacked
 * dev builds, which each get a different ID). The session is broadcast to every
 * ID; each browser silently ignores the ones it doesn't have installed.
 *
 * If it isn't configured or no listed extension is installed, this no-ops
 * silently — the web app still works on its own.
 */
export default function ExtensionAuthBridge() {
  useEffect(() => {
    const extensionIds = (process.env.NEXT_PUBLIC_POKEBROWSE_EXTENSION_ID ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (extensionIds.length === 0) return;

    const sendMessage = window.chrome?.runtime?.sendMessage;
    if (typeof sendMessage !== "function") return;

    const post = (msg: unknown) => {
      for (const extensionId of extensionIds) {
        try {
          sendMessage(extensionId, msg, () => {
            // Swallow lastError — set when the extension is missing or hasn't
            // accepted the connection. Accessing it clears the runtime warning.
            void window.chrome?.runtime?.lastError;
          });
        } catch {
          // chrome.runtime.sendMessage can throw synchronously if the extension
          // is fully unavailable; that's fine, we just skip that ID.
        }
      }
    };

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
