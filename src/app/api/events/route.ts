import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEvents } from "@/lib/queries";
import { requireUser, internalError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const events = await getEvents(supabase, auth.user.id);
    return NextResponse.json(events);
  } catch (error) {
    return internalError("GET /api/events", error);
  }
}
