import { describe, expect, it } from "vitest";
import { signAdminToken, verifyAdminToken } from "./admin-auth";

describe("admin-auth token", () => {
  it("signs and verifies a token for the right secret", () => {
    const token = signAdminToken("s3cret");
    expect(verifyAdminToken(token, "s3cret")).toBe(true);
  });

  it("rejects tokens from a different secret", () => {
    const token = signAdminToken("s3cret");
    expect(verifyAdminToken(token, "other")).toBe(false);
  });

  it("rejects garbage, missing and empty input", () => {
    expect(verifyAdminToken("not-a-token", "s3cret")).toBe(false);
    expect(verifyAdminToken(undefined, "s3cret")).toBe(false);
    expect(verifyAdminToken(null, "s3cret")).toBe(false);
    expect(verifyAdminToken(signAdminToken("s3cret"), "")).toBe(false);
    expect(verifyAdminToken(signAdminToken("s3cret"), undefined as never)).toBe(false);
  });

  it("is deterministic per secret", () => {
    expect(signAdminToken("a")).toBe(signAdminToken("a"));
    expect(signAdminToken("a")).not.toBe(signAdminToken("b"));
  });
});