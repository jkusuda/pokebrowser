import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updatePrivacy } from "@/lib/queries";
import { requireUser, badRequest, internalError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { isPrivate } = await request.json();
    if (typeof isPrivate !== "boolean") {
      return badRequest("isPrivate must be a boolean");
    }

    await updatePrivacy(supabase, auth.user.id, isPrivate);
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError("POST /api/trainer/privacy", error);
  }
}
