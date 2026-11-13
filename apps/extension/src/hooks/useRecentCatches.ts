import { useState, useEffect } from "react";
import type { Pokemon } from "api-client";
import { api } from "../lib/api";

type Result = { userId: string; catches: Pokemon[] };

export function useRecentCatches(userId: string | undefined, limit = 9) {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const settle = (catches: Pokemon[]) => {
      if (!cancelled) setResult({ userId, catches });
    };
    api.recentPokemon(limit).then(settle, () => settle([]));
    return () => {
      cancelled = true;
    };
  }, [userId, limit]);

  const current = result?.userId === userId ? result : null;
  return { catches: current?.catches ?? [], loading: !!userId && !current };
}
