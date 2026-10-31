/**
 * Login username helpers.
 *
 * Usernames are stored lowercase so lookups are reliably case-insensitive and
 * the tenant-scoped unique index cannot be bypassed by casing differences.
 */
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Returns an error message, or null when the username is valid. */
export function validateUsername(raw: string): string | null {
  const username = normalizeUsername(raw);
  if (!username) return "Username is required.";
  if (username.length < 3) return "Username must be at least 3 characters.";
  if (username.length > 30) return "Username must be 30 characters or fewer.";
  if (!USERNAME_RE.test(username)) {
    return "Username can use letters, numbers, dots, underscores, and hyphens, and must start and end with a letter or number.";
  }
  return null;
}

/** Best-effort username derived from an email; used for bootstrap accounts. */
export function usernameFromEmail(email: string): string {
  const local = (email.split("@")[0] ?? "").toLowerCase();
  const base = local
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .slice(0, 30);
  return base || `user-${Date.now().toString(36)}`;
}
