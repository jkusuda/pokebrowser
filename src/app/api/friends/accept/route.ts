import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acceptFriendRequest } from "@/lib/queries";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_FRIENDS = 100;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { friendshipId } = body;

    if (typeof friendshipId !== "string" || !UUID_RE.test(friendshipId)) {
      return NextResponse.json({ error: "friendshipId must be a valid UUID" }, { status: 400 });
    }

    // Verify the row exists and the current user is the recipient
    const { data: friendship } = await supabase
      .from("friends")
      .select("id, status, friend_id")
      .eq("id", friendshipId)
      .single();

    if (!friendship) {
      return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
    }

    if (friendship.friend_id !== user.id) {
      return NextResponse.json({ error: "Only the recipient can accept a friend request" }, { status: 403 });
    }

    if (friendship.status !== "pending") {
      return NextResponse.json({ error: "Friend request is no longer pending" }, { status: 409 });
    }

    // Enforce 100-friend cap on the accepting user
    const { count } = await supabase
      .from("friends")
      .select("id", { count: "exact", head: true })
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq("status", "accepted");

    if ((count ?? 0) >= MAX_FRIENDS) {
      return NextResponse.json({ error: "You have reached the maximum number of friends (100)" }, { status: 429 });
    }

    await acceptFriendRequest(supabase, friendshipId, user.id);

    const { data: newAchievements } = await supabase.rpc("check_action_achievements", {
      p_trigger: "friend_accept",
    });

    return NextResponse.json({ success: true, newAchievements: newAchievements ?? [] });
  } catch (error) {
    console.error("friends/accept error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
