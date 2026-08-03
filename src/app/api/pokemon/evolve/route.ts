import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPokemonName, POKEDEX_SIZE } from "pokemon-data";
import { evolvePokemon } from "@/lib/queries";
import { requireUser, badRequest, internalError, UUID_RE } from "@/lib/api-helpers";
import { errorMessage } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { pokemonId, targetId } = await request.json();
    if (typeof pokemonId !== "string" || !UUID_RE.test(pokemonId)) {
      return badRequest("pokemonId must be a valid UUID");
    }
    // Optional: branching lines send the chosen species. Omitted (or null) lets
    // the RPC fall back to the canonical target.
    if (
      targetId != null &&
      (typeof targetId !== "number" ||
        !Number.isInteger(targetId) ||
        targetId < 1 ||
        targetId > POKEDEX_SIZE)
    ) {
      return badRequest(`targetId must be an integer between 1 and ${POKEDEX_SIZE}`);
    }

    const { data: pokemon } = await supabase
      .from("pokemon")
      .select("id, nickname, pokedex_number")
      .eq("id", pokemonId)
      .eq("user_id", auth.user.id)
      .single();

    if (!pokemon) {
      return NextResponse.json({ error: "Pokemon not found or not owned by user" }, { status: 403 });
    }

    const result = await evolvePokemon(supabase, pokemonId, targetId ?? null);

    // Caught Pokémon store the species name as their default "nickname"
    // (set in the extension at catch time). If the name was never customized,
    // advance it to the evolved species' name; keep genuinely custom nicknames.
    if (pokemon.nickname === getPokemonName(pokemon.pokedex_number)) {
      await supabase
        .from("pokemon")
        .update({ nickname: getPokemonName(result.to_pokedex_number) })
        .eq("id", pokemonId);
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    // Map known RPC rejections to clean 400s; everything else is a 500.
    const msg = errorMessage(error);
    if (/insufficient_candy|not_evolvable|not_found/.test(msg)) {
      return badRequest(
        msg.includes("insufficient_candy") ? "Not enough candy to evolve" : "This Pokemon can't evolve"
      );
    }
    return internalError("POST /api/pokemon/evolve", error);
  }
}
