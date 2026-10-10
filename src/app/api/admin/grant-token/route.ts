import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { devGrantToken } from "@/lib/queries";
import { POKEMON_TYPES } from "@/lib/types";
import { getPokemonData } from "pokemon-data";
import { requireAdmin, badRequest, internalError, readJsonObject } from "@/lib/api-helpers";
import { errorMessage } from "@/lib/utils";

const VALID_TOKEN_TYPES = new Set(["legendary", "mythical", "type_pick", "shiny", "species"]);
const VALID_TYPES = new Set<string>(POKEMON_TYPES);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireAdmin(supabase);
    if (auth.response) return auth.response;

    const body = await readJsonObject(request);
    if (body === null) return badRequest("body must be a JSON object");

    const { tokenType, typeFilter, pokedexNumber } = body;
    if (typeof tokenType !== "string" || !VALID_TOKEN_TYPES.has(tokenType)) {
      return badRequest(`tokenType must be one of: ${[...VALID_TOKEN_TYPES].join(", ")}`);
    }
    if (typeFilter !== undefined && typeFilter !== null) {
      if (typeof typeFilter !== "string" || !VALID_TYPES.has(typeFilter.toLowerCase())) {
        return badRequest(`typeFilter must be one of: ${[...VALID_TYPES].join(", ")}`);
      }
    }

    const pokedex = pokedexNumber ?? null;
    if (
      (tokenType === "species") !== (pokedex !== null) ||
      (pokedex !== null &&
        (typeof pokedex !== "number" || !Number.isInteger(pokedex) || !getPokemonData(pokedex)))
    ) {
      return badRequest("pokedexNumber must be a valid Pokédex number, set only for species tokens");
    }

    await devGrantToken(
      supabase,
      tokenType,
      typeof typeFilter === "string" && typeFilter ? typeFilter.toLowerCase() : null,
      pokedex
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    if (errorMessage(error) === "Not authorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    return internalError("POST /api/admin/grant-token", error);
  }
}
