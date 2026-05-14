import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FriendProfile, Pokemon } from "@/types";

const FRIEND_CODE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ friendCode: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { friendCode } = await params;

    if (!FRIEND_CODE_RE.test(friendCode)) {
      return NextResponse.json(
        { error: "friendCode must be in the format XXXX-XXXX" },
        { status: 400 }
      );
    }

    // Look up target user
    const { data: targetUser } = await supabase
      .from("users")
      .select("id, trainer_name, avatar_id, level, xp, friend_code, favorite_pokemon_id")
      .eq("friend_code", friendCode.toUpperCase())
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    // Allow self-lookup OR accepted friends only
    if (targetUser.id !== user.id) {
      const { data: friendship } = await supabase
        .from("friends")
        .select("id")
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`
        )
        .eq("status", "accepted")
        .maybeSingle();

      if (!friendship) {
        return NextResponse.json({ error: "Not authorized to view this profile" }, { status: 403 });
      }
    }

    // Resolve buddy Pokémon if set
    let buddy: Pick<Pokemon, "id" | "pokedex_number" | "is_shiny" | "nickname"> | null = null;
    if (targetUser.favorite_pokemon_id) {
      const { data: buddyData } = await supabase
        .from("pokemon")
        .select("id, pokedex_number, is_shiny, nickname")
        .eq("id", targetUser.favorite_pokemon_id)
        .single();
      buddy = buddyData ?? null;
    }

    // Find the friendship id (needed for remove button on the client)
    const { data: friendshipRow } = await supabase
      .from("friends")
      .select("id")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`
      )
      .eq("status", "accepted")
      .maybeSingle();

    const profile: FriendProfile = {
      id: targetUser.id,
      friendship_id: friendshipRow?.id ?? "",
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
    console.error("friends/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
