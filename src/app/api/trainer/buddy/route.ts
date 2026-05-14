import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setFavoritePokemon } from "@/lib/queries";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pokemonId } = body;

    // pokemonId can be null (to clear the buddy) or a valid UUID
    if (pokemonId !== null) {
      if (typeof pokemonId !== "string" || !UUID_RE.test(pokemonId)) {
        return NextResponse.json({ error: "pokemonId must be a valid UUID or null" }, { status: 400 });
      }

      // Verify the Pokémon belongs to the current user
      const { data: pokemon } = await supabase
        .from("pokemon")
        .select("id")
        .eq("id", pokemonId)
        .eq("user_id", user.id)
        .single();

      if (!pokemon) {
        return NextResponse.json({ error: "Pokémon not found or not owned by you" }, { status: 403 });
      }
    }

    await setFavoritePokemon(supabase, user.id, pokemonId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("trainer/buddy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
