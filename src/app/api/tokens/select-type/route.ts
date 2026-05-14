import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { selectTokenType } from "@/lib/queries";
import { GEN1_TYPES } from "@/lib/types";

const VALID_TYPES = new Set<string>(GEN1_TYPES);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tokenId, typeName } = body;

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof tokenId !== "string" || !UUID_RE.test(tokenId)) {
      return NextResponse.json({ error: "tokenId must be a valid UUID" }, { status: 400 });
    }

    if (typeof typeName !== "string" || !VALID_TYPES.has(typeName.toLowerCase())) {
      return NextResponse.json(
        { error: `typeName must be one of: ${[...VALID_TYPES].join(", ")}` },
        { status: 400 }
      );
    }

    await selectTokenType(supabase, user.id, tokenId, typeName.toLowerCase());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/tokens/select-type error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
