"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * The single "re-sync the profile from the server" primitive. Components call
 * `refresh()` after their own mutations succeed; `useRealtimeRefresh` covers
 * changes made elsewhere (extension catches, other devices).
 */
export function useRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(
    () => startTransition(() => router.refresh()),
    [router]
  );

  return { refresh, pending };
}
