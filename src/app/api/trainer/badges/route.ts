import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setDisplayedBadges } from "@/lib/queries";
import { requireUser, badRequest, internalError } from "@/lib/api-helpers";
import { errorMessage } from "@/lib/utils";
import { BADGE_ID_SET, MAX_DISPLAYED_BADGES } from "@/lib/badges-data";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { badgeIds } = await request.json();

    if (!Array.isArray(badgeIds) || badgeIds.length > MAX_DISPLAYED_BADGES) {
      return badRequest(`badgeIds must be an array of at most ${MAX_DISPLAYED_BADGES} badge ids`);
    }
    if (badgeIds.some((id) => typeof id !== "string" || !BADGE_ID_SET.has(id))) {
      return badRequest("badgeIds contains an unknown badge id");
    }
    if (new Set(badgeIds).size !== badgeIds.length) {
      return badRequest("badgeIds must not contain duplicates");
    }

    // The set_displayed_badges RPC verifies each badge's achievement is
    // actually unlocked for the caller.
    await setDisplayedBadges(supabase, badgeIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (errorMessage(error) === "Badge not unlocked") {
      return NextResponse.json({ error: "Badge not unlocked" }, { status: 403 });
    }
    return internalError("POST /api/trainer/badges", error);
  }
}
