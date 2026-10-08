/**
 * In-memory sliding-window rate limiter for public server actions.
 *
 * Deliberately process-local (Map of timestamps per key) — no Redis dependency.
 * Each server instance gets its own counters, which is acceptable for abuse
 * damping (an attacker must spread requests across instances to dilute).
 *
 * Usage:
 *   const rl = rateLimit(`placeOrder:${ip}`, 5, 60_000);
 *   if (!rl.ok) return { ok: false, error: "Too many attempts..." };
 */

type Window = { hits: number[] };

const buckets = new Map<string, Window>();

/** Sweep old buckets so the Map can't grow unbounded under key churn. */
const SWEEP_INTERVAL_MS = 5 * 60_000;
let lastSweep = 0;

function sweep(now: number, windowMs: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, win] of buckets) {
    if (win.hits.length === 0 || now - win.hits[win.hits.length - 1] > windowMs * 2) {
      buckets.delete(key);
    }
  }
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

/**
 * Record a hit for `key` and decide whether it's allowed.
 *
 * @param key    bucket identity — use caller + scope, e.g. `lookupEmail:1.2.3.4`
 * @param limit  max hits per window
 * @param windowMs sliding window length in ms
 * @param now    injectable clock (tests)
 */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  sweep(now, windowMs);

  const win = buckets.get(key) ?? { hits: [] };
  const cutoff = now - windowMs;
  // hits are appended in order; drop everything outside the window from the front.
  let firstValid = win.hits.findIndex((t) => t > cutoff);
  if (firstValid === -1) {
    win.hits = [];
  } else if (firstValid > 0) {
    win.hits = win.hits.slice(firstValid);
  }

  if (win.hits.length >= limit) {
    buckets.set(key, win);
    const oldest = win.hits[0];
    const retryAfterMs = Math.max(oldest + windowMs - now, 0);
    return { ok: false, retryAfterSeconds: Math.max(Math.ceil(retryAfterMs / 1000), 1) };
  }

  win.hits.push(now);
  buckets.set(key, win);
  return { ok: true, remaining: limit - win.hits.length };
}

/** Reset all buckets — tests only. */
export function resetRateLimits(): void {
  buckets.clear();
  lastSweep = 0;
}
