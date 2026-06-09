import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setFavoritePokemon } from "@/lib/queries";
import { requireUser, badRequest, internalError, UUID_RE } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { pokemonId } = await request.json();

    // pokemonId is either a valid UUID or null (clears the buddy).
    if (pokemonId !== null) {
      if (typeof pokemonId !== "string" || !UUID_RE.test(pokemonId)) {
        return badRequest("pokemonId must be a valid UUID or null");
      }

      const { data: pokemon } = await supabase
        .from("pokemon")
        .select("id")
        .eq("id", pokemonId)
        .eq("user_id", auth.user.id)
        .single();

      if (!pokemon) {
        return NextResponse.json({ error: "Pokémon not found or not owned by you" }, { status: 403 });
      }
    }

    await setFavoritePokemon(supabase, auth.user.id, pokemonId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError("POST /api/trainer/buddy", error);
  }
}
