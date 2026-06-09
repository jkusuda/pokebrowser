"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Supabase Realtime postgres_changes for every table that
 * affects the trainer profile, and triggers a debounced router.refresh()
 * on any change. Lets the profile page reflect writes made elsewhere
 * (the extension, a friend accepting a request) without manual reload.
 */
export function useRealtimeRefresh(userId: string) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    // 1s debounce: a single catch can fire writes against 4+ tables; without
    // a longer window each one would trigger a separate full page refresh.
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 1000);
    };

    const channel = supabase
      .channel(`pb:profile:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pokemon", filter: `user_id=eq.${userId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "pokedex", filter: `user_id=eq.${userId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "candies", filter: `user_id=eq.${userId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "achievement_unlocks", filter: `user_id=eq.${userId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "tokens", filter: `user_id=eq.${userId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "users", filter: `id=eq.${userId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "friends", filter: `user_id=eq.${userId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "friends", filter: `friend_id=eq.${userId}` }, scheduleRefresh)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId, router]);
}
