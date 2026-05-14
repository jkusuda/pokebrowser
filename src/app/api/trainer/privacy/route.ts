import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updatePrivacy } from "@/lib/queries";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { isPrivate } = body;

    if (typeof isPrivate !== "boolean") {
      return NextResponse.json({ error: "isPrivate must be a boolean" }, { status: 400 });
    }

    await updatePrivacy(supabase, user.id, isPrivate);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("trainer/privacy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
