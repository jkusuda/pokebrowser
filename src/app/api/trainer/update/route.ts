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

    await updateTrainerProfile(supabase, user.id, { trainerName, avatarId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Trainer update API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
