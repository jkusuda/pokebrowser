import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeFriendOrDecline } from "@/lib/queries";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    // Verify the row exists and the current user is a party to it
    const { data: friendship } = await supabase
      .from("friends")
      .select("id, user_id, friend_id")
      .eq("id", friendshipId)
      .single();

    if (!friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    if (friendship.user_id !== user.id && friendship.friend_id !== user.id) {
      return NextResponse.json({ error: "You are not part of this friendship" }, { status: 403 });
    }

    await removeFriendOrDecline(supabase, friendshipId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("friends/remove error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
