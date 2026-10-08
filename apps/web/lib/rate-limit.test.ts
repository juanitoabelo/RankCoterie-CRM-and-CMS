import { afterEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "./rate-limit";

afterEach(() => resetRateLimits());

describe("rateLimit", () => {
  it("allows up to the limit within the window", () => {
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) {
      expect(rateLimit("k", 5, 60_000, now).ok).toBe(true);
    }
    const last = rateLimit("k", 5, 60_000, now);
    expect(last.ok).toBe(true);
    expect(last.ok && last.remaining).toBe(0);
  });

  it("blocks the next request over the limit and reports retryAfter", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) rateLimit("k", 5, 60_000, now);
    const blocked = rateLimit("k", 5, 60_000, now);
    expect(blocked.ok).toBe(false);
    // Oldest hit was at `now`, so the window clears in the full 60s.
    expect(blocked.ok === false && blocked.retryAfterSeconds).toBe(60);
  });

  it("frees capacity as the window slides", () => {
    const start = 1_000_000;
    for (let i = 0; i < 5; i++) rateLimit("k", 5, 60_000, start);
    expect(rateLimit("k", 5, 60_000, start).ok).toBe(false);

    // 30s later — nothing has expired yet.
    expect(rateLimit("k", 5, 60_000, start + 30_000).ok).toBe(false);

    // 61s after the first hit — the first hit falls out of the window.
    const later = rateLimit("k", 5, 60_000, start + 61_000);
    expect(later.ok).toBe(true);
  });

  it("keeps buckets independent per key", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) rateLimit("a", 5, 60_000, now);
    expect(rateLimit("a", 5, 60_000, now).ok).toBe(false);
    expect(rateLimit("b", 5, 60_000, now).ok).toBe(true);
  });

  it("emits integer retry-after of at least 1s", () => {
    const now = 1_000_000;
    rateLimit("k", 1, 60_000, now);
    const blocked = rateLimit("k", 1, 60_000, now + 59_500);
    expect(blocked.ok).toBe(false);
    expect(blocked.ok === false && blocked.retryAfterSeconds).toBe(1);
  });
});
