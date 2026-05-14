import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateTrainerProfile } from "@/lib/queries";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { trainerName, avatarId } = body;

    if (
      typeof trainerName !== "string" ||
      trainerName.length < 1 ||
      trainerName.length > 24
    ) {
      return NextResponse.json(
        { error: "trainerName must be a string between 1 and 24 characters" },
        { status: 400 }
      );
    }

    if (
      typeof avatarId !== "string" ||
      avatarId.length < 1 ||
      avatarId.length > 8
    ) {
      return NextResponse.json(
        { error: "avatarId must be a string between 1 and 8 characters" },
        { status: 400 }
      );
    }

    // Fetch current values to detect which fields actually changed
    const { data: current } = await supabase
      .from("users")
      .select("trainer_name, avatar_id")
      .eq("id", user.id)
      .single();

    await updateTrainerProfile(supabase, user.id, { trainerName, avatarId });

    // Check achievements for each field that changed
    const triggers: string[] = [];
    if (current && current.trainer_name !== trainerName) triggers.push("trainer_name_change");
    if (current && current.avatar_id !== avatarId) triggers.push("avatar_change");

    const newAchievements: string[] = [];
    for (const trigger of triggers) {
      const { data } = await supabase.rpc("check_action_achievements", { p_trigger: trigger });
      if (data) newAchievements.push(...(data as string[]));
    }

    return NextResponse.json({ success: true, newAchievements });
  } catch (error: any) {
    console.error("Trainer update API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
