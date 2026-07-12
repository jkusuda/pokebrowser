import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redeemToken } from "@/lib/queries";
import { requireUser, badRequest, internalError, UUID_RE } from "@/lib/api-helpers";
import { errorMessage } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { tokenId } = await request.json();
    if (typeof tokenId !== "string" || !UUID_RE.test(tokenId)) {
      return badRequest("tokenId must be a UUID");
    }

    // Stats + achievement checks happen inside the redeem_token RPC, in the
    // same transaction as the catch.
    const result = await redeemToken(supabase, tokenId);

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
