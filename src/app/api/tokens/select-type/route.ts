import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { selectTokenType } from "@/lib/queries";
import { GEN1_TYPES } from "@/lib/types";
import { requireUser, badRequest, internalError, UUID_RE } from "@/lib/api-helpers";

const VALID_TYPES = new Set<string>(GEN1_TYPES);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { tokenId, typeName } = await request.json();
    if (typeof tokenId !== "string" || !UUID_RE.test(tokenId)) {
      return badRequest("tokenId must be a valid UUID");
    }
    if (typeof typeName !== "string" || !VALID_TYPES.has(typeName.toLowerCase())) {
      return badRequest(`typeName must be one of: ${[...VALID_TYPES].join(", ")}`);
    }

    await selectTokenType(supabase, auth.user.id, tokenId, typeName.toLowerCase());
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError("POST /api/tokens/select-type", error);
  }
}
