import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimCandyReward } from "@/lib/queries";
import { requireUser, badRequest, internalError } from "@/lib/api-helpers";
import { errorMessage } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { pokedexNumber } = await request.json();
    if (
      typeof pokedexNumber !== "number" ||
      !Number.isInteger(pokedexNumber) ||
      pokedexNumber < 1 ||
      pokedexNumber > 151
    ) {
      return badRequest("pokedexNumber must be an integer between 1 and 151");
    }

    await claimCandyReward(supabase, pokedexNumber);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = errorMessage(error);
    if (msg === "No pending candy rewards" || msg === "Candy reward already claimed") {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    if (msg === "Species not in Pokédex") {
      return badRequest("Species not in Pokédex");
    }
    return internalError("POST /api/rewards/claim-candy", error);
  }
}
