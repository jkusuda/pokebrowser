// One-way web app → Chrome extension channel.
//
// Chrome doesn't let a page discover an installed extension's ID, so the IDs
// come from NEXT_PUBLIC_POKEBROWSE_EXTENSION_ID (comma-separated, Web Store ID
// first). We broadcast to every listed ID; browsers silently ignore the ones
// they don't have installed. The extension's manifest declares this origin in
// `externally_connectable.matches` and Chrome enforces that allowlist at the
// runtime layer, so nothing else on the page can intercept these messages.
//
// Everything here is best-effort: if the extension is missing, the ID is
// unset, or the user is on a non-Chrome browser, these calls no-op.

function extensionIds(): string[] {
  return (process.env.NEXT_PUBLIC_POKEBROWSE_EXTENSION_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/** Broadcasts a message to every configured extension ID. */
export function postToExtension(message: unknown): void {
  const ids = extensionIds();
  if (ids.length === 0) return;

  const sendMessage = window.chrome?.runtime?.sendMessage;
  if (typeof sendMessage !== "function") return;

  for (const extensionId of ids) {
    try {
      sendMessage(extensionId, message, () => {
        // Swallow lastError — set when the extension is missing or hasn't
        // accepted the connection. Accessing it clears the runtime warning.
        void window.chrome?.runtime?.lastError;
      });
    } catch {
      // sendMessage can throw synchronously if the extension is fully
      // unavailable; skip that ID.
    }
  }
}

/**
 * Tells the extension a settings change landed, so it applies immediately
 * instead of waiting for its next GET_SESSION (which is throttled, and is
 * skipped entirely on blocked pages — so a freshly-blocked site would
 * otherwise stay active until some unrelated page load refreshed the cache).
 *
 * This is only a fast path. The `users` columns remain the source of truth
 * and the extension re-reads them on every GET_SESSION regardless, so a
 * dropped message costs freshness, never correctness.
 */
export function notifyExtensionPrefsChanged(prefs: {
  soundEnabled?: boolean;
  encounterAnimations?: boolean;
  blockedSites?: string[];
}): void {
  postToExtension({ type: "POKEBROWSE_PREFS", payload: prefs });
}
