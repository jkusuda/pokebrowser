import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updatePokemonNickname } from "@/lib/queries";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pokemonId, nickname } = body;

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof pokemonId !== "string" || !UUID_RE.test(pokemonId)) {
      return NextResponse.json({ error: "pokemonId must be a valid UUID" }, { status: 400 });
    }

    if (typeof nickname !== "string" || nickname.length < 1 || nickname.length > 12) {
      return NextResponse.json(
        { error: "nickname must be a string between 1 and 12 characters" },
        { status: 400 }
      );
    }

    const { data: pokemon } = await supabase
      .from("pokemon")
      .select("id")
      .eq("id", pokemonId)
      .eq("user_id", user.id)
      .single();

    if (!pokemon) {
      return NextResponse.json({ error: "Pokemon not found or not owned by user" }, { status: 403 });
    }

    await updatePokemonNickname(supabase, pokemonId, nickname);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Pokemon nickname API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
