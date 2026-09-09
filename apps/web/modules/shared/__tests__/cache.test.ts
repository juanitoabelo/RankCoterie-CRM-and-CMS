/**
 * Shared Module — Cache Tests
 */
import { describe, it, expect, beforeEach } from "vitest";
import { MemoryCache } from "../cache";

describe("MemoryCache", () => {
  let cache: MemoryCache<string>;

  beforeEach(() => {
    cache = new MemoryCache<string>(1000); // 1 second TTL for tests
  });

  it("stores and retrieves values", () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("returns undefined for missing keys", () => {
    expect(cache.get("missing")).toBeUndefined();
  });

  it("respects TTL", async () => {
    cache.set("key1", "value1", 50); // 50ms TTL
    expect(cache.get("key1")).toBe("value1");
    
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(cache.get("key1")).toBeUndefined();
  });

  it("deletes values", () => {
    cache.set("key1", "value1");
    cache.delete("key1");
    expect(cache.get("key1")).toBeUndefined();
  });

  it("clears all values", () => {
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.clear();
    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBeUndefined();
  });

  it("evicts stale entries when cache grows large", () => {
    // Fill cache with expired entries
    for (let i = 0; i < 101; i++) {
      cache.set(`expired-${i}`, `value-${i}`, -1); // Already expired
    }
    
    // Adding a new entry should trigger eviction
    cache.set("new", "value");
    expect(cache.get("new")).toBe("value");
  });
});
