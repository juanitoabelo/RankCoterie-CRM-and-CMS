const TTL_MS = 60_000;
const DEFAULT_KEY = "__default__";

let cache = new Map<string, { data: unknown; expiresAt: number }>();

function cacheKey(pathname: string): string {
  if (pathname === DEFAULT_KEY) return pathname;
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export function readSiteLayoutCache<T>(pathname = DEFAULT_KEY, now = Date.now()): T | null {
  const entry = cache.get(cacheKey(pathname));
  if (entry && now < entry.expiresAt) return entry.data as T;
  return null;
}

export function writeSiteLayoutCache(data: unknown, pathname = DEFAULT_KEY) {
  cache.set(cacheKey(pathname), { data, expiresAt: Date.now() + TTL_MS });
}

export function clearSiteLayoutCache(pathname?: string) {
  if (!pathname) {
    cache = new Map();
    return;
  }
  cache.delete(cacheKey(pathname));
}
