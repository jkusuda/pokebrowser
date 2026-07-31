import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEventLeaderboard } from "@/lib/queries";
import { requireUser, badRequest, internalError, UUID_RE } from "@/lib/api-helpers";
import { errorMessage } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const eventId = new URL(request.url).searchParams.get("eventId");
    if (!eventId || !UUID_RE.test(eventId)) {
      return badRequest("eventId must be a valid UUID");
    }

    const leaderboard = await getEventLeaderboard(supabase, eventId);
    return NextResponse.json(leaderboard);
  } catch (error) {
    if (errorMessage(error) === "Event not found") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return internalError("GET /api/events/leaderboard", error);
  }
}
