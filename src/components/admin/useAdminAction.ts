"use client";

import { useCallback, useState } from "react";

/**
 * Shared run/busy/status plumbing for admin tools: every action is a one-shot
 * async call that should disable the section's buttons and report success or
 * the server's error message.
 */
export function useAdminAction() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const run = useCallback(async (label: string, action: () => Promise<unknown>) => {
    setBusy(true);
    setStatus(null);
    try {
      await action();
      setStatus({ ok: true, message: `${label} succeeded` });
    } catch (err) {
      setStatus({
        ok: false,
        message: `${label} failed: ${err instanceof Error ? err.message : "unknown error"}`,
      });
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, status, run, clearStatus: useCallback(() => setStatus(null), []) };
}
