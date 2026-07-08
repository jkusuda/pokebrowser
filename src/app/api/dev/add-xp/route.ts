import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { devAddXp } from "@/lib/queries";
import { requireUser, badRequest, internalError, errorMessage } from "@/lib/api-helpers";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { amount } = await request.json();
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1 || amount > 1_000_000) {
      return badRequest("amount must be an integer between 1 and 1000000");
    }

    const result = await devAddXp(supabase, amount);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (errorMessage(error) === "Not authorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    return internalError("POST /api/dev/add-xp", error);
  }
}
