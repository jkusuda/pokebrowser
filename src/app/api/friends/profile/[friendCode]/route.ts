import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FriendProfile } from "@/types";
import { requireUser, badRequest, internalError, FRIEND_CODE_RE } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ friendCode: string }> }
) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { friendCode } = await params;
    if (!FRIEND_CODE_RE.test(friendCode)) {
      return badRequest("friendCode must be in the format XXXX-XXXX");
    }

    // Authorization (self or accepted friend), the buddy lookup, and the
    // narrowed users-table visibility all live inside get_friend_profile, so
    // a stranger's row is never exposed by a direct code lookup.
    const { data, error } = await supabase.rpc("get_friend_profile", {
      p_friend_code: friendCode.toUpperCase(),
    });

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("not_found")) {
        return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
      }
      if (msg.includes("not_authorized")) {
        return NextResponse.json({ error: "Not authorized to view this profile" }, { status: 403 });
      }
      throw error;
    }

    return NextResponse.json(data as FriendProfile);
  } catch (error) {
    return internalError("GET /api/friends/profile/[friendCode]", error);
  }
}
