/**
 * Shared Module — Cache Utilities
 * 
 * Simple in-memory caching utilities for avoiding repeated DB hits.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** Simple in-memory cache with TTL */
export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;

  constructor(defaultTTLMs: number = 30_000) {
    this.defaultTTL = defaultTTLMs;
  }

  /** Get a value from cache */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** Set a value in cache */
  set(key: string, value: T, ttlMs?: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
    });
    this.evictStale();
  }

  /** Delete a value from cache */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /** Clear all cache entries */
  clear(): void {
    this.cache.clear();
  }

  /** Evict stale entries when cache grows too large */
  private evictStale(): void {
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [key, entry] of this.cache) {
        if (now > entry.expiresAt) this.cache.delete(key);
      }
    }
  }
}
