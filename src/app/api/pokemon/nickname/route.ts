import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updatePokemonNickname } from "@/lib/queries";
import { requireUser, badRequest, internalError, UUID_RE } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { pokemonId, nickname } = await request.json();

    if (typeof pokemonId !== "string" || !UUID_RE.test(pokemonId)) {
      return badRequest("pokemonId must be a valid UUID");
    }
    if (typeof nickname !== "string" || nickname.length < 1 || nickname.length > 12) {
      return badRequest("nickname must be a string between 1 and 12 characters");
    }

    const { data: pokemon } = await supabase
      .from("pokemon")
      .select("id")
      .eq("id", pokemonId)
      .eq("user_id", auth.user.id)
      .single();

    if (!pokemon) {
      return NextResponse.json({ error: "Pokemon not found or not owned by user" }, { status: 403 });
    }

    await updatePokemonNickname(supabase, pokemonId, nickname);

    const { data: newAchievements } = await supabase.rpc("check_action_achievements", {
      p_trigger: "nickname",
    });

    return NextResponse.json({ success: true, newAchievements: newAchievements ?? [] });
  } catch (error) {
    return internalError("POST /api/pokemon/nickname", error);
  }
}
