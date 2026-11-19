import { describe, expect, it } from "vitest";
import { apiKeyPrefix, hashApiKey, hasRequiredScope, parseBearer } from "../auth-helpers";

describe("CRM API auth helpers", () => {
  it("hashes API keys deterministically without exposing the raw value", () => {
    const hash = hashApiKey("rc_live_abcdefghijklmnop");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashApiKey("rc_live_abcdefghijklmnop"));
    expect(hash).not.toContain("abcdefghijklmnop");
  });

  it("builds a short display prefix", () => {
    expect(apiKeyPrefix("rc_live_abcdefghijklmnop")).toBe("rc_live_abcd");
  });

  it("parses bearer tokens and rejects malformed headers", () => {
    expect(parseBearer("Bearer abc123")).toBe("abc123");
    expect(parseBearer("bearer abc123")).toBe("abc123");
    expect(parseBearer("Basic abc123")).toBeNull();
    expect(parseBearer("Bearer")).toBeNull();
    expect(parseBearer(undefined)).toBeNull();
  });

  it("checks exact and wildcard scopes", () => {
    expect(hasRequiredScope(["crm:read"], "crm:read")).toBe(true);
    expect(hasRequiredScope(["crm:*"], "crm:write")).toBe(true);
    expect(hasRequiredScope(["crm:read"], "crm:write")).toBe(false);
    expect(hasRequiredScope(["*"], "anything")).toBe(true);
  });
});
