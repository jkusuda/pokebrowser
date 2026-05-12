import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { RecentPokemon } from "shared-types";

export function useRecentCatches(userId: string | undefined, limit = 9) {
  const [catches, setCatches] = useState<RecentPokemon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setCatches([]);
      return;
    }

    setLoading(true);
    supabase
      .from("pokemon")
      .select("id, pokedex_number, nickname, is_shiny, caught_at")
      .eq("user_id", userId)
      .order("caught_at", { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (!error && data) setCatches(data as RecentPokemon[]);
        setLoading(false);
      });
  }, [userId, limit]);

  return { catches, loading };
}
