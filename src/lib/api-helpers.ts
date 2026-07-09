import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const FRIEND_CODE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i;

type AuthResult =
  | { user: { id: string }; response: null }
  | { user: null; response: NextResponse };

/**
 * Resolves the authenticated user for an API route. Returns either the user
 * (so callers can `if (auth.response) return auth.response`) or a ready-made
 * 401 response.
 */
export async function requireUser(supabase: SupabaseClient): Promise<AuthResult> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user: { id: user.id }, response: null };
}

/** Generic 400. Safe to expose because we control the message. */
export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** Logs full detail server-side; sends generic 500 to the client. */
export function internalError(scope: string, error: unknown) {
  console.error(`${scope}:`, error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
