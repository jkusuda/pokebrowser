import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { devAddXp } from "@/lib/queries";
import { requireAdmin, badRequest, internalError, readJsonObject } from "@/lib/api-helpers";
import { errorMessage } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireAdmin(supabase);
    if (auth.response) return auth.response;

    const body = await readJsonObject(request);
    const amount = body?.amount;
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1 || amount > 1_000_000) {
      return badRequest("amount must be an integer between 1 and 1000000");
    }

    const result = await devAddXp(supabase, amount);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (errorMessage(error) === "Not authorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    return internalError("POST /api/admin/add-xp", error);
  }
}
