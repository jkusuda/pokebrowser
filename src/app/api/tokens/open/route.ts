import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redeemToken } from "@/lib/queries";
import { requireUser, badRequest, internalError, UUID_RE } from "@/lib/api-helpers";
import { errorMessage } from "@/lib/utils";
import { getPokemonData } from "@/lib/pokemon";

const LEGENDARY_IDS = [144, 145, 146, 150, 151];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { tokenId } = await request.json();
    if (typeof tokenId !== "string" || !UUID_RE.test(tokenId)) {
      return badRequest("tokenId must be a UUID");
    }

    const result = await redeemToken(supabase, tokenId);

    // Stats + achievement checks, same as the extension does after a catch.
    // Awaited (serverless can't fire-and-forget) but non-fatal: the catch
    // itself already committed.
    try {
      await supabase.rpc("update_catch_stats", {
        p_is_shiny: result.isShiny,
        p_is_legendary: LEGENDARY_IDS.includes(result.pokedexNumber),
        p_types: getPokemonData(result.pokedexNumber)?.types ?? [],
        p_caught_on: "pokebrowser.net",
      });
    } catch (statsError) {
      console.error("POST /api/tokens/open: update_catch_stats failed", statsError);
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const msg = errorMessage(error);
    if (msg === "Token not found") {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
    if (msg === "Token already used") {
      return NextResponse.json({ error: "Token already used" }, { status: 409 });
    }
    if (msg === "Choose a type first") {
      return NextResponse.json({ error: "Choose a type first" }, { status: 409 });
    }
    if (msg === "Box is full") {
      return NextResponse.json({ error: "Box is full" }, { status: 409 });
    }
    return internalError("POST /api/tokens/open", error);
  }
}
