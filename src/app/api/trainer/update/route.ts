import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateTrainerProfile } from "@/lib/queries";
import { requireUser, badRequest, internalError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { trainerName, avatarId } = await request.json();

    if (typeof trainerName !== "string" || trainerName.length < 1 || trainerName.length > 24) {
      return badRequest("trainerName must be a string between 1 and 24 characters");
    }
    if (typeof avatarId !== "string" || avatarId.length < 1 || avatarId.length > 8) {
      return badRequest("avatarId must be a string between 1 and 8 characters");
    }

    // Detect which fields actually changed so we only fire matching achievements.
    const { data: current } = await supabase
      .from("users")
      .select("trainer_name, avatar_id")
      .eq("id", auth.user.id)
      .single();

    await updateTrainerProfile(supabase, auth.user.id, { trainerName, avatarId });

    const triggers: string[] = [];
    if (current && current.trainer_name !== trainerName) triggers.push("trainer_name_change");
    if (current && current.avatar_id !== avatarId) triggers.push("avatar_change");

    const newAchievements: string[] = [];
    for (const trigger of triggers) {
      const { data } = await supabase.rpc("check_action_achievements", { p_trigger: trigger });
      if (Array.isArray(data)) newAchievements.push(...(data as string[]));
    }

    return NextResponse.json({ success: true, newAchievements });
  } catch (error) {
    return internalError("POST /api/trainer/update", error);
  }
}
