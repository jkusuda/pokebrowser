import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard } from "@/lib/queries";
import { requireUser, badRequest, internalError } from "@/lib/api-helpers";
import { LeaderboardCategory } from "@/types";

const VALID_CATEGORIES: LeaderboardCategory[] = ["catches", "sites"];

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const category = new URL(request.url).searchParams.get("category");
    if (!category || !VALID_CATEGORIES.includes(category as LeaderboardCategory)) {
      return badRequest("category must be one of: catches, sites");
    }

    const leaderboard = await getLeaderboard(supabase, category as LeaderboardCategory);
    return NextResponse.json(leaderboard);
  } catch (error) {
    return internalError("GET /api/leaderboard", error);
  }
}
