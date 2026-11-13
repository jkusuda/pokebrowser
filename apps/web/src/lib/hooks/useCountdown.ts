"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

function formatRemaining(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days}d ${pad(hours)}h ${pad(minutes)}m`;
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

function subscribeEverySecond(onTick: () => void) {
  const interval = setInterval(onTick, 1000);
  return () => clearInterval(interval);
}

/**
 * Live countdown to `targetIso`, corrected for client-clock drift via
 * `serverNow` (the ISO time the server stamped on the response). Returns a
 * formatted string like "3d 04h 12m" (or "04h 12m 05s" under a day), or null
 * when there's no target. Sticks at "00h 00m 00s" once the target passes.
 */
export function useCountdown(targetIso: string | null, serverNow: string | null): string | null {
  // The deadline expressed on *this client's* clock, sampled once per
  // (target, serverNow) pair. The server-vs-client offset must not be
  // recomputed on every tick: `Date.now() + (serverNow - Date.now())` collapses
  // back to serverNow, which makes the snapshot a constant, and
  // useSyncExternalStore (Object.is) then never re-renders — the countdown
  // freezes at whatever it read on the first tick.
  const deadlineRef = useRef<{ key: string; value: number } | null>(null);

  // The wall clock is external mutable state, so it's read through
  // useSyncExternalStore: a 1s interval invalidates, and the snapshot is the
  // whole-seconds remainder (stable within each second).
  const getSnapshot = useCallback(() => {
    if (!targetIso) return -1;
    const key = `${targetIso}|${serverNow ?? ""}`;
    if (deadlineRef.current?.key !== key) {
      const offsetMs = serverNow ? Date.parse(serverNow) - Date.now() : 0;
      deadlineRef.current = { key, value: Date.parse(targetIso) - offsetMs };
    }
    return Math.max(0, Math.floor((deadlineRef.current.value - Date.now()) / 1000));
  }, [targetIso, serverNow]);

  const remainingSeconds = useSyncExternalStore(
    subscribeEverySecond,
    getSnapshot,
    () => -1 // server render: no countdown until hydrated
  );

  return remainingSeconds < 0 ? null : formatRemaining(remainingSeconds);
}
