import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard } from "@/lib/queries";
import { requireUser, badRequest, internalError } from "@/lib/api-helpers";
import { LeaderboardCategory } from "@/types";

const VALID_CATEGORIES: LeaderboardCategory[] = ["catches", "sites"];
const VALID_SCOPES = ["global", "friends"] as const;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const searchParams = new URL(request.url).searchParams;
    const category = searchParams.get("category");
    if (!category || !VALID_CATEGORIES.includes(category as LeaderboardCategory)) {
      return badRequest("category must be one of: catches, sites");
    }

    const scope = searchParams.get("scope") ?? "global";
    if (!VALID_SCOPES.includes(scope as (typeof VALID_SCOPES)[number])) {
      return badRequest("scope must be one of: global, friends");
    }

    const leaderboard = await getLeaderboard(supabase, category as LeaderboardCategory, scope === "friends");
    return NextResponse.json(leaderboard);
  } catch (error) {
    return internalError("GET /api/leaderboard", error);
  }
}
