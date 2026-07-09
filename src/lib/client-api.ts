// Client-side helper for calling the app's API routes. Kept separate from
// api-helpers.ts (server-only: it imports next/server) so client components
// never pull server modules into their bundle.

/**
 * POSTs a JSON body to an API route and returns the parsed JSON response.
 * On a non-2xx status, throws an Error carrying the route's `error` message
 * (falling back to `fallbackError`), so callers handle every failure in one
 * catch block.
 */
export async function postJson<T = Record<string, unknown>>(
  url: string,
  body?: unknown,
  fallbackError = "Request failed"
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? fallbackError);
  return json as T;
}
