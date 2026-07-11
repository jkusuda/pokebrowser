import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateTheme } from "@/lib/queries";
import { isThemeId } from "@/lib/themes";
import { requireUser, badRequest, internalError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth.response) return auth.response;

    const { theme } = await request.json();
    if (!isThemeId(theme)) {
      return badRequest("theme must be one of: green, blue");
    }

    await updateTheme(supabase, auth.user.id, theme);
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError("POST /api/trainer/theme", error);
  }
}
