import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTrainerData } from "@/lib/queries";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getTrainerData(supabase, user.id);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Trainer API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
