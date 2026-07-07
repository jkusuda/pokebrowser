import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AchievementUnlock } from "@/types";
import { ACHIEVEMENTS } from "@/lib/achievements-data";
import { requireUser, internalError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { data: unlocks, error } = await supabase
      .from("achievement_unlocks")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("unlocked_at", { ascending: false });

    if (error) throw error;

    const unlockedById = Object.fromEntries(
      ((unlocks ?? []) as AchievementUnlock[]).map((u) => [u.achievement_id, u])
    );

    // Merge static definitions with the user's unlock state.
    const merged = ACHIEVEMENTS.map((def) => ({
      ...def,
      unlock: unlockedById[def.id] ?? null,
    }));

    return NextResponse.json({ achievements: merged });
  } catch (error) {
    return internalError("GET /api/achievements", error);
  }
}
