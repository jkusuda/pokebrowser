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

/**
 * Same as `requireUser`, plus a `users.is_admin` check. Admin routes reject
 * with 404 rather than 403 so they don't confirm the endpoint exists to a
 * non-admin. This is a cheap early exit — the real boundary is the `is_admin`
 * check inside every `dev_*` SECURITY DEFINER RPC, which runs regardless.
 */
export async function requireAdmin(supabase: SupabaseClient): Promise<AuthResult> {
  const auth = await requireUser(supabase);
  if (auth.response) return auth;

  const { data, error } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", auth.user.id)
    .single();

  if (error || !data?.is_admin) {
    return {
      user: null,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return auth;
}

/**
 * Parses a JSON request body and guarantees a plain object, so routes can
 * destructure it safely. A `null` / array / scalar body yields null instead of
 * throwing a TypeError into the generic 500 handler.
 */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
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
