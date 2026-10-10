// Hostname rules for the per-site Pokebrowser blocklist, shared by the
// settings modal (which normalizes what the user types) and
// /api/trainer/blocked-sites (which re-validates it — the client is not
// trusted just because it happens to be ours).
//
// Entries are bare lowercase hostnames with no scheme, port, or path. An
// entry covers its subdomains, so "reddit.com" also blocks
// "old.reddit.com"; the extension does that match in content.ts.

export const MAX_BLOCKED_SITES = 100;

/** RFC-1123-ish: dot-separated labels of alphanumerics and inner hyphens. */
function isValidHostname(host: string): boolean {
  if (host.length === 0 || host.length > 253) return false;

  // Require a dot, so single-word leftovers from a mangled input don't sail
  // through as a "valid" site — "javascript:alert(1)" has no "//" for the
  // scheme strip to catch, and would otherwise reduce to "javascript".
  // localhost is the one single-label host worth supporting.
  if (!host.includes(".") && host !== "localhost") return false;

  return host.split(".").every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9-]+$/.test(label) &&
      !label.startsWith("-") &&
      !label.endsWith("-")
  );
}

/**
 * Reduces anything the user might paste — "https://www.Reddit.com/r/foo?x=1",
 * "reddit.com:443", "REDDIT.COM." — to the bare hostname "reddit.com".
 * Returns null when what's left isn't a usable hostname.
 *
 * A leading "www." is dropped deliberately: subdomain matching only widens
 * downward, so storing "www.reddit.com" would leave bare "reddit.com"
 * unblocked, which is never what someone means.
 */
export function normalizeHostname(input: string): string | null {
  let host = input.trim().toLowerCase();
  if (!host) return null;

  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // scheme
  host = host.split(/[/?#]/)[0];                       // path, query, fragment
  host = host.split("@").pop() ?? host;                // userinfo
  host = host.split(":")[0];                           // port
  host = host.replace(/\.+$/, "");                     // trailing root dot
  host = host.replace(/^www\./, "");

  return isValidHostname(host) ? host : null;
}

/**
 * Validates a whole blocklist from a request body. Returns the cleaned,
 * deduped list, or null if the payload isn't an array of valid hostnames.
 */
export function sanitizeBlockedSites(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > MAX_BLOCKED_SITES) return null;

  const cleaned: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") return null;
    const host = normalizeHostname(entry);
    if (!host) return null;
    if (!cleaned.includes(host)) cleaned.push(host);
  }
  return cleaned;
}
