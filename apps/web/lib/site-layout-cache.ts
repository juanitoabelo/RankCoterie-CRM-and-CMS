/**
 * Process-wide cache for the storefront layout (tenant theme, header/footer
 * blocks, menus). Lives in its own module so server actions can purge it —
 * `revalidatePath` only clears Next's route cache, not this in-memory copy.
 */
const TTL_MS = 60_000;

let cache: { data: unknown; expiresAt: number } | null = null;

export function readSiteLayoutCache<T>(now = Date.now()): T | null {
  if (cache && now < cache.expiresAt) return cache.data as T;
  return null;
}

export function writeSiteLayoutCache(data: unknown) {
  cache = { data, expiresAt: Date.now() + TTL_MS };
}

export function clearSiteLayoutCache() {
  cache = null;
}
