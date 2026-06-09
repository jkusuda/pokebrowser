import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acceptFriendRequest } from "@/lib/queries";
import { requireUser, badRequest, internalError, UUID_RE } from "@/lib/api-helpers";

const MAX_FRIENDS = 100;

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
      .select("id, status, friend_id")
      .eq("id", friendshipId)
      .single();

    if (!friendship) {
      return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
    }
    if (friendship.friend_id !== auth.user.id) {
      return NextResponse.json(
        { error: "Only the recipient can accept a friend request" },
        { status: 403 }
      );
    }
    if (friendship.status !== "pending") {
      return NextResponse.json({ error: "Friend request is no longer pending" }, { status: 409 });
    }

    const { count } = await supabase
      .from("friends")
      .select("id", { count: "exact", head: true })
      .or(`user_id.eq.${auth.user.id},friend_id.eq.${auth.user.id}`)
      .eq("status", "accepted");

    if ((count ?? 0) >= MAX_FRIENDS) {
      return NextResponse.json(
        { error: `You have reached the maximum number of friends (${MAX_FRIENDS})` },
        { status: 429 }
      );
    }

    await acceptFriendRequest(supabase, friendshipId, auth.user.id);

    const { data: newAchievements } = await supabase.rpc("check_action_achievements", {
      p_trigger: "friend_accept",
    });

    return NextResponse.json({ success: true, newAchievements: newAchievements ?? [] });
  } catch (error) {
    return internalError("POST /api/friends/accept", error);
  }
}
