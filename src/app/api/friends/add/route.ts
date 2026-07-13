import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createFriendRequest, hasFriendCapacity, MAX_FRIENDS } from "@/lib/queries";
import { requireUser, badRequest, internalError, FRIEND_CODE_RE } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { friendCode } = await request.json();
    if (typeof friendCode !== "string" || !FRIEND_CODE_RE.test(friendCode)) {
      return badRequest("friendCode must be in the format XXXX-XXXX (letters and numbers only)");
    }

    const normalized = friendCode.toUpperCase();

    const { data: matches } = await supabase.rpc("find_user_id_by_friend_code", {
      p_friend_code: normalized,
    });
    const targetUser = (matches as { id: string; is_private: boolean }[] | null)?.[0] ?? null;

    if (!targetUser) {
      return NextResponse.json({ error: "Friend code not found" }, { status: 404 });
    }
    if (targetUser.id === auth.user.id) {
      return badRequest("You cannot add yourself as a friend");
    }
    if (targetUser.is_private) {
      return NextResponse.json({ error: "This trainer's profile is private" }, { status: 403 });
    }

    // Existing relationship in either direction blocks a new request.
    const { data: existing } = await supabase
      .from("friends")
      .select("id, status")
      .or(
        `and(user_id.eq.${auth.user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${auth.user.id})`
      )
      .maybeSingle();

    if (existing) {
      const msg = existing.status === "accepted"
        ? "You are already friends with this trainer"
        : "A friend request is already pending with this trainer";
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    if (!(await hasFriendCapacity(supabase, auth.user.id))) {
      return NextResponse.json(
        { error: `You have reached the maximum number of friends (${MAX_FRIENDS})` },
        { status: 429 }
      );
    }

    await createFriendRequest(supabase, auth.user.id, targetUser.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError("POST /api/friends/add", error);
  }
}
