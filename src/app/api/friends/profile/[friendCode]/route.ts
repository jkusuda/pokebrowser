import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FriendProfile, Pokemon } from "@/types";
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

    const { data: targetUser } = await supabase
      .from("users")
      .select("id, trainer_name, avatar_id, level, xp, friend_code, favorite_pokemon_id")
      .eq("friend_code", friendCode.toUpperCase())
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    // Look up the friendship once and use it for both authorization
    // (self-lookup OR accepted friends only) and the remove-button payload.
    let friendshipId = "";
    if (targetUser.id !== auth.user.id) {
      const { data: friendship } = await supabase
        .from("friends")
        .select("id")
        .or(
          `and(user_id.eq.${auth.user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${auth.user.id})`
        )
        .eq("status", "accepted")
        .maybeSingle();

      if (!friendship) {
        return NextResponse.json({ error: "Not authorized to view this profile" }, { status: 403 });
      }
      friendshipId = friendship.id;
    }

    let buddy: Pick<Pokemon, "id" | "pokedex_number" | "is_shiny" | "nickname"> | null = null;
    if (targetUser.favorite_pokemon_id) {
      const { data: buddyData } = await supabase
        .from("pokemon")
        .select("id, pokedex_number, is_shiny, nickname")
        .eq("id", targetUser.favorite_pokemon_id)
        .single();
      buddy = buddyData ?? null;
    }

    const profile: FriendProfile = {
      id: targetUser.id,
      friendship_id: friendshipId,
      trainer_name: targetUser.trainer_name,
      avatar_id: targetUser.avatar_id,
      level: targetUser.level,
      xp: targetUser.xp,
      friend_code: targetUser.friend_code,
      favorite_pokemon_id: targetUser.favorite_pokemon_id,
      buddy,
    };

    return NextResponse.json(profile);
  } catch (error) {
    return internalError("GET /api/friends/profile/[friendCode]", error);
  }
}
