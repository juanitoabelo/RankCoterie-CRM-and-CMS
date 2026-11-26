const TTL_MS = 60_000;
const DEFAULT_KEY = "__default__";
const SHARED_KEY = "__shared__";

type CacheEntry = { data: unknown; expiresAt: number };

let cache = new Map<string, CacheEntry>();
let sharedCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

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

/** Data shared by every storefront route (tenant, menus, header/footer templates). */
export function readSharedSiteLayoutCache<T>(now = Date.now()): T | null {
  const entry = sharedCache.get(SHARED_KEY);
  if (entry && now < entry.expiresAt) return entry.data as T;
  return null;
}

export function writeSharedSiteLayoutCache(data: unknown) {
  sharedCache.set(SHARED_KEY, { data, expiresAt: Date.now() + TTL_MS });
}

/**
 * Read-through cache for shared layout data. Concurrent requests (a prefetch
 * and the following navigation, for example) share one load instead of each
 * hitting the database.
 */
export async function loadSharedSiteLayoutCache<T>(load: () => Promise<T>): Promise<T> {
  const cached = readSharedSiteLayoutCache<T>();
  if (cached) return cached;

  const pending = inFlight.get(SHARED_KEY);
  if (pending) return pending as Promise<T>;

  const promise = load()
    .then((data) => {
      writeSharedSiteLayoutCache(data);
      return data;
    })
    .finally(() => {
      inFlight.delete(SHARED_KEY);
    });

  inFlight.set(SHARED_KEY, promise);
  return promise;
}

/** Read-through cache for data that varies by pathname. */
export async function loadSiteLayoutCache<T>(pathname: string, load: () => Promise<T>): Promise<T> {
  const key = cacheKey(pathname);
  const cached = readSiteLayoutCache<T>(key);
  if (cached) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = load()
    .then((data) => {
      writeSiteLayoutCache(data, key);
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export function clearSiteLayoutCache(pathname?: string) {
  if (!pathname) {
    cache = new Map();
    sharedCache = new Map();
    inFlight.clear();
    return;
  }
  cache.delete(cacheKey(pathname));
  if (pathname === SHARED_KEY) sharedCache.delete(SHARED_KEY);
}
