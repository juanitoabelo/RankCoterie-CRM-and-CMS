import { describe, expect, it } from "vitest";
import { signWebhookPayload, verifyWebhookSignature } from "./signature";

describe("outbound webhook signatures", () => {
  it("signs and verifies a payload", () => {
    const payload = '{"event":"deal.updated"}';
    const signature = signWebhookPayload("top-secret", payload);
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(verifyWebhookSignature("top-secret", payload, signature)).toBe(true);
  });

  it("rejects tampered, missing, and wrongly formatted signatures", () => {
    const payload = '{"event":"deal.updated"}';
    const signature = signWebhookPayload("top-secret", payload);
    expect(verifyWebhookSignature("top-secret", `${payload} `, signature)).toBe(false);
    expect(verifyWebhookSignature("top-secret", payload, null)).toBe(false);
    expect(verifyWebhookSignature("top-secret", payload, "md5=abc")).toBe(false);
  });
});
