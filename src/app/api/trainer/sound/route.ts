import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateSoundEnabled } from "@/lib/queries";
import { requireUser, badRequest, internalError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { soundEnabled } = await request.json();
    if (typeof soundEnabled !== "boolean") {
      return badRequest("soundEnabled must be a boolean");
    }

    await updateSoundEnabled(supabase, auth.user.id, soundEnabled);
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError("POST /api/trainer/sound", error);
  }
}
