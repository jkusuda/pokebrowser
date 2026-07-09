import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { devUnlockAchievement } from "@/lib/queries";
import { requireUser, badRequest, internalError } from "@/lib/api-helpers";
import { errorMessage } from "@/lib/utils";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { achievementId } = await request.json();
    if (typeof achievementId !== "string" || achievementId.length === 0 || achievementId.length > 64) {
      return badRequest("achievementId must be a non-empty string");
    }

    const unlocked = await devUnlockAchievement(supabase, achievementId);
    return NextResponse.json({ success: true, unlocked });
  } catch (error) {
    if (errorMessage(error) === "Not authorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    return internalError("POST /api/dev/unlock-achievement", error);
  }
}
