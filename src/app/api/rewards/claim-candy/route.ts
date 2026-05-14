import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimCandyReward } from "@/lib/queries";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pokedexNumber } = body;

    if (
      typeof pokedexNumber !== "number" ||
      !Number.isInteger(pokedexNumber) ||
      pokedexNumber < 1 ||
      pokedexNumber > 151
    ) {
      return NextResponse.json(
        { error: "pokedexNumber must be an integer between 1 and 151" },
        { status: 400 }
      );
    }

    await claimCandyReward(supabase, user.id, pokedexNumber);

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "No pending candy rewards") {
      return NextResponse.json({ error: "No pending candy rewards" }, { status: 409 });
    }
    if (msg === "Species not in Pokédex") {
      return NextResponse.json({ error: "Species not in Pokédex" }, { status: 400 });
    }
    console.error("POST /api/rewards/claim-candy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
