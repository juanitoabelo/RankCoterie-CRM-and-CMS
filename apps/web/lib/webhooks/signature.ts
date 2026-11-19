import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhookPayload(secret: string, payload: string): string {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

export function verifyWebhookSignature(
  secret: string,
  payload: string,
  signature: string | null | undefined,
): boolean {
  if (!signature || !signature.startsWith("sha256=")) return false;
  const expected = Buffer.from(signWebhookPayload(secret, payload).slice(7), "hex");
  const actual = Buffer.from(signature.slice(7), "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
