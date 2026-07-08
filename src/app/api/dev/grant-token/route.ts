import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { devGrantToken } from "@/lib/queries";
import { GEN1_TYPES } from "@/lib/types";
import { requireUser, badRequest, internalError, errorMessage } from "@/lib/api-helpers";

const VALID_TOKEN_TYPES = new Set(["legendary", "mythical", "type_pick", "shiny"]);
const VALID_TYPES = new Set<string>(GEN1_TYPES);

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { tokenType, typeFilter } = await request.json();
    if (typeof tokenType !== "string" || !VALID_TOKEN_TYPES.has(tokenType)) {
      return badRequest(`tokenType must be one of: ${[...VALID_TOKEN_TYPES].join(", ")}`);
    }
    if (typeFilter !== undefined && typeFilter !== null) {
      if (typeof typeFilter !== "string" || !VALID_TYPES.has(typeFilter.toLowerCase())) {
        return badRequest(`typeFilter must be one of: ${[...VALID_TYPES].join(", ")}`);
      }
    }

    await devGrantToken(supabase, tokenType, typeFilter ? typeFilter.toLowerCase() : null);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (errorMessage(error) === "Not authorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    return internalError("POST /api/dev/grant-token", error);
  }
}
