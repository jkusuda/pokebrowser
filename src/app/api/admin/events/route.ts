import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { devCreateEvent, getAllEvents } from "@/lib/queries";
import { requireAdmin, badRequest, internalError, readJsonObject } from "@/lib/api-helpers";
import { errorMessage } from "@/lib/utils";
import { validateEventInput } from "./validate";

/** Full event schedule for the admin panel — the public /api/events caps its lists. */
export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireAdmin(supabase);
    if (auth.response) return auth.response;

    const events = await getAllEvents(supabase);
    return NextResponse.json({ events });
  } catch (error) {
    return internalError("GET /api/admin/events", error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireAdmin(supabase);
    if (auth.response) return auth.response;

    const validated = validateEventInput(await readJsonObject(request));
    if (validated.error !== null) return badRequest(validated.error);

    const eventId = await devCreateEvent(supabase, validated.input);
    return NextResponse.json({ success: true, eventId });
  } catch (error) {
    const msg = errorMessage(error);
    if (msg === "Not authorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (msg === "Overlaps an existing event") {
      return NextResponse.json({ error: "Overlaps an existing event" }, { status: 409 });
    }
    return internalError("POST /api/admin/events", error);
  }
}
