"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { postToExtension as post } from "@/lib/extension-bridge";

/** Hands the Supabase session to the extension whenever it changes. */
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
