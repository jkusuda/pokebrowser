import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeFriendOrDecline } from "@/lib/queries";
import { requireUser, badRequest, internalError, UUID_RE } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { friendshipId } = await request.json();
    if (typeof friendshipId !== "string" || !UUID_RE.test(friendshipId)) {
      return badRequest("friendshipId must be a valid UUID");
    }

    const { data: friendship } = await supabase
      .from("friends")
      .select("id, user_id, friend_id")
      .eq("id", friendshipId)
      .single();

    if (!friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }
    if (friendship.user_id !== auth.user.id && friendship.friend_id !== auth.user.id) {
      return NextResponse.json({ error: "You are not part of this friendship" }, { status: 403 });
    }

    await removeFriendOrDecline(supabase, friendshipId, auth.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError("POST /api/friends/remove", error);
  }
}
