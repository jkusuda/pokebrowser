// One-way, best-effort channel to the extension. Pages can't discover an
// extension's ID, so we broadcast to every configured ID; Chrome only delivers
// to origins in the extension's `externally_connectable`, so nothing else on
// the page sees these messages.

function extensionIds(): string[] {
  return (process.env.NEXT_PUBLIC_POKEBROWSE_EXTENSION_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function postToExtension(message: unknown): void {
  const ids = extensionIds();
  if (ids.length === 0) return;

  const sendMessage = window.chrome?.runtime?.sendMessage;
  if (typeof sendMessage !== "function") return;

  for (const extensionId of ids) {
    try {
      // Reading lastError silences Chrome's warning when the extension is missing.
      sendMessage(extensionId, message, () => void window.chrome?.runtime?.lastError);
    } catch {
      // Extension unavailable: skip this ID.
    }
  }
}

// Fast path so a settings change applies without waiting for the extension's
// next roll; the API stays the source of truth.
export function notifyExtensionPrefsChanged(prefs: {
  soundEnabled?: boolean;
  encounterAnimations?: boolean;
  blockedSites?: string[];
}): void {
  postToExtension({ type: "POKEBROWSE_PREFS", payload: prefs });
}
