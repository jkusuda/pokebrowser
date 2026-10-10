import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateEncounterAnimations } from "@/lib/queries";
import { requireUser, badRequest, internalError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { enabled } = await request.json();
    if (typeof enabled !== "boolean") {
      return badRequest("enabled must be a boolean");
    }

    await updateEncounterAnimations(supabase, auth.user.id, enabled);
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError("POST /api/trainer/animations", error);
  }
}
