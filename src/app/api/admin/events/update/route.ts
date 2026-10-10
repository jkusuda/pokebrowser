import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { devUpdateEvent, DEV_EVENT_INPUT_ERRORS } from "@/lib/queries";
import { requireAdmin, badRequest, internalError, readJsonObject, UUID_RE } from "@/lib/api-helpers";
import { errorMessage } from "@/lib/utils";
import { validateEventInput } from "../validate";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireAdmin(supabase);
    if (auth.response) return auth.response;

    const body = await readJsonObject(request);
    if (body === null) return badRequest("body must be a JSON object");

    const { eventId } = body;
    if (typeof eventId !== "string" || !UUID_RE.test(eventId)) {
      return badRequest("eventId must be a valid UUID");
    }
    const validated = validateEventInput(body);
    if (validated.error !== null) return badRequest(validated.error);

    await devUpdateEvent(supabase, eventId, validated.input);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = errorMessage(error);
    if (msg === "Not authorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (msg === "Overlaps an existing event") {
      return NextResponse.json({ error: "Overlaps an existing event" }, { status: 409 });
    }
    if (DEV_EVENT_INPUT_ERRORS.has(msg)) return badRequest(msg);
    if (msg === "Event not found") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (msg.startsWith("Goal already reached")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return internalError("POST /api/admin/events/update", error);
  }
}
