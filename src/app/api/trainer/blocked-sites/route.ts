import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateBlockedSites } from "@/lib/queries";
import { requireUser, badRequest, internalError } from "@/lib/api-helpers";
import { sanitizeBlockedSites, MAX_BLOCKED_SITES } from "@/lib/blocked-sites";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { sites } = await request.json();
    const cleaned = sanitizeBlockedSites(sites);
    if (!cleaned) {
      return badRequest(
        `sites must be an array of at most ${MAX_BLOCKED_SITES} valid hostnames`
      );
    }

    await updateBlockedSites(supabase, auth.user.id, cleaned);
    return NextResponse.json({ success: true, sites: cleaned });
  } catch (error) {
    return internalError("POST /api/trainer/blocked-sites", error);
  }
}
