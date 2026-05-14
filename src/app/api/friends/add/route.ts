import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createFriendRequest } from "@/lib/queries";

const FRIEND_CODE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
const MAX_FRIENDS = 100;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { friendCode } = body;

    if (typeof friendCode !== "string" || !FRIEND_CODE_RE.test(friendCode)) {
      return NextResponse.json(
        { error: "friendCode must be in the format XXXX-XXXX (letters and numbers only)" },
        { status: 400 }
      );
    }

    // Look up the target user
    const { data: targetUser } = await supabase
      .from("users")
      .select("id, is_private")
      .eq("friend_code", friendCode.toUpperCase())
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: "Friend code not found" }, { status: 404 });
    }

    // Prevent self-friending
    if (targetUser.id === user.id) {
      return NextResponse.json({ error: "You cannot add yourself as a friend" }, { status: 400 });
    }

    // Respect privacy setting
    if (targetUser.is_private) {
      return NextResponse.json({ error: "This trainer's profile is private" }, { status: 403 });
    }

    // Check for existing friendship in either direction
    const { data: existing } = await supabase
      .from("friends")
      .select("id, status")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      const msg =
        existing.status === "accepted"
          ? "You are already friends with this trainer"
          : "A friend request is already pending with this trainer";
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    // Enforce 100-friend cap on the sender's accepted count
    const { count } = await supabase
      .from("friends")
      .select("id", { count: "exact", head: true })
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq("status", "accepted");

    if ((count ?? 0) >= MAX_FRIENDS) {
      return NextResponse.json({ error: "You have reached the maximum number of friends (100)" }, { status: 429 });
    }

    await createFriendRequest(supabase, user.id, targetUser.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("friends/add error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
