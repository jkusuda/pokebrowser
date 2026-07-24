import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markTutorialSeen } from "@/lib/queries";
import { requireUser, internalError } from "@/lib/api-helpers";

export async function POST() {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    await markTutorialSeen(supabase, auth.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError("POST /api/trainer/tutorial", error);
  }
}
