import { beforeAll, describe, expect, it } from "vitest";
import {
  decryptToken,
  encryptToken,
  signOAuthState,
  verifyOAuthState,
} from "../oauth-crypto";

describe("CRM OAuth crypto", () => {
  beforeAll(() => {
    process.env.CRM_TOKEN_ENCRYPTION_KEY = "crm-test-token-encryption-key";
    process.env.CRM_OAUTH_STATE_SECRET = "crm-test-oauth-state-secret";
  });

  it("round-trips encrypted tokens with a fresh IV", () => {
    const first = encryptToken("access-token-value");
    const second = encryptToken("access-token-value");
    expect(first).not.toBe(second);
    expect(decryptToken(first)).toBe("access-token-value");
    expect(decryptToken(second)).toBe("access-token-value");
  });

  it("rejects tampered token payloads", () => {
    const encrypted = encryptToken("secret");
    const raw = Buffer.from(encrypted.slice(3), "base64url");
    raw[raw.length - 1] ^= 1;
    const tampered = `v1:${raw.toString("base64url")}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("signs and verifies short-lived OAuth state", () => {
    const state = signOAuthState({ provider: "google", userId: "user-1" });
    const verified = verifyOAuthState(state);
    expect(verified).toMatchObject({ provider: "google", userId: "user-1" });
    expect(verifyOAuthState(`${state.slice(0, -1)}x`)).toBeNull();
  });
});
