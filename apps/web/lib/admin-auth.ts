/**
 * Canopy V2 — minimal admin auth (pre-Auth.js).
 *
 * Shared-secret HMAC token in an httpOnly cookie. Auth.js (README stack) replaces
 * this in a later phase; until then this keeps the back office (suppression,
 * review queue) behind a secret instead of wide open.
 *
 * Pure functions — unit-testable.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "canopy_admin";
export const TOKEN_SECRET_CONTEXT = "canopy-admin-token";

export function signAdminToken(secret: string): string {
  return createHmac("sha256", secret).update(TOKEN_SECRET_CONTEXT).digest("hex");
}

export function verifyAdminToken(token: string | undefined | null, secret: string): boolean {
  if (!token || !secret) return false;
  const expected = signAdminToken(secret);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}