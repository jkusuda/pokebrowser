import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AchievementUnlock } from "@/types";
import { ACHIEVEMENTS } from "@/lib/achievements-data";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: unlocks, error } = await supabase
      .from("achievement_unlocks")
      .select("*")
      .eq("user_id", user.id)
      .order("unlocked_at", { ascending: false });

    if (error) throw error;

    const unlockedById = Object.fromEntries(
      ((unlocks as AchievementUnlock[]) ?? []).map((u) => [u.achievement_id, u])
    );

    // Merge static definitions with user's unlock state
    const merged = ACHIEVEMENTS.map((def) => ({
      ...def,
      unlock: unlockedById[def.id] ?? null,
    }));

    return NextResponse.json({ achievements: merged });
  } catch (error) {
    console.error("GET /api/achievements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
