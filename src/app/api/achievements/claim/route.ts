import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimAchievement } from "@/lib/queries";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { achievementId } = body;

    if (typeof achievementId !== "string" || achievementId.length === 0 || achievementId.length > 64) {
      return NextResponse.json({ error: "achievementId must be a non-empty string" }, { status: 400 });
    }

    const result = await claimAchievement(supabase, user.id, achievementId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Already claimed") {
      return NextResponse.json({ error: "Already claimed" }, { status: 409 });
    }
    if (msg === "Achievement not found") {
      return NextResponse.json({ error: "Achievement not found" }, { status: 404 });
    }
    if (msg === "Unknown achievement") {
      return NextResponse.json({ error: "Unknown achievement" }, { status: 400 });
    }
    console.error("POST /api/achievements/claim error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
