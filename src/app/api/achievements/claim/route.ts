import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimAchievement } from "@/lib/queries";
import { requireUser, badRequest, internalError, errorMessage } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { achievementId } = await request.json();
    if (typeof achievementId !== "string" || achievementId.length === 0 || achievementId.length > 64) {
      return badRequest("achievementId must be a non-empty string");
    }

    const result = await claimAchievement(supabase, achievementId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const msg = errorMessage(error);
    if (msg === "Already claimed") {
      return NextResponse.json({ error: "Already claimed" }, { status: 409 });
    }
    if (msg === "Achievement not found") {
      return NextResponse.json({ error: "Achievement not found" }, { status: 404 });
    }
    if (msg === "Unknown achievement") {
      return badRequest("Unknown achievement");
    }
    return internalError("POST /api/achievements/claim", error);
  }
}
