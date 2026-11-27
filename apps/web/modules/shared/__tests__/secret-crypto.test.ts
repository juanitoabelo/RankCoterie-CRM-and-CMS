import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  secretEncryptionConfigured,
} from "../secret-crypto";

describe("shared secret crypto", () => {
  const original = process.env.AI_TOKEN_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.AI_TOKEN_ENCRYPTION_KEY = "test-provider-key-encryption-secret";
  });

  afterAll(() => {
    if (original === undefined) delete process.env.AI_TOKEN_ENCRYPTION_KEY;
    else process.env.AI_TOKEN_ENCRYPTION_KEY = original;
  });

  it("reports encryption configuration", () => {
    expect(secretEncryptionConfigured()).toBe(true);
  });

  it("round-trips secrets with a fresh IV", () => {
    const first = encryptSecret("provider-api-key");
    const second = encryptSecret("provider-api-key");
    expect(first).not.toBe(second);
    expect(first.startsWith("v1:")).toBe(true);
    expect(decryptSecret(first)).toBe("provider-api-key");
    expect(decryptSecret(second)).toBe("provider-api-key");
  });

  it("rejects tampered payloads", () => {
    const encrypted = encryptSecret("provider-api-key");
    const raw = Buffer.from(encrypted.slice(3), "base64url");
    raw[raw.length - 1] ^= 1;
    expect(() => decryptSecret(`v1:${raw.toString("base64url")}`)).toThrow();
  });

  it("rejects unsupported formats", () => {
    expect(() => decryptSecret("v2:abc")).toThrow("Unsupported encrypted secret format.");
  });
});
