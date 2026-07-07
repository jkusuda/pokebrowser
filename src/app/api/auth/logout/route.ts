import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, internalError } from "@/lib/api-helpers";

export async function POST() {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError("POST /api/auth/logout", error);
  }
}
