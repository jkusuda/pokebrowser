import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { devDeleteEvent } from "@/lib/queries";
import { requireAdmin, badRequest, internalError, readJsonObject, UUID_RE } from "@/lib/api-helpers";
import { errorMessage } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireAdmin(supabase);
    if (auth.response) return auth.response;

    const body = await readJsonObject(request);
    const eventId = body?.eventId;
    if (typeof eventId !== "string" || !UUID_RE.test(eventId)) {
      return badRequest("eventId must be a valid UUID");
    }

    await devDeleteEvent(supabase, eventId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = errorMessage(error);
    if (msg === "Not authorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (msg === "Event not found") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return internalError("POST /api/admin/events/delete", error);
  }
}
