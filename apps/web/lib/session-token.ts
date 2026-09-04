/**
 * Canopy V2 — pure session-token codec.
 *
 * Edge-safe (no `next/headers`, no DB, no Node APIs beyond global `crypto`):
 * signs/verifies the `canopy_session` token value using Web Crypto HMAC-SHA256.
 * Shared by the Proxy guard (Edge) and server helpers (Node).
 */

export const SESSION_COOKIE = "canopy_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

function secretKey(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required in production.");
  return secret || "canopy-dev-session-secret-change-me";
}

async function importKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secretKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function b64url(buf: Uint8Array): string {
  return Buffer.from(buf).toString("base64url");
}

function b64urlDecode(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, "base64url"));
}

export async function signSessionToken(payload: string): Promise<string> {
  const key = await importKey();
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64url(new Uint8Array(sig));
}

async function verifyToken(payload: string, sig: string): Promise<boolean> {
  try {
    const key = await importKey();
    const enc = new TextEncoder();
    const expected = b64urlDecode(sig);
    return crypto.subtle.verify("HMAC", key, expected, enc.encode(payload));
  } catch {
    return false;
  }
}

export interface SessionPayload {
  uid: string;
  exp: number;
}

export function encodeSessionPayload(p: SessionPayload): string {
  return Buffer.from(JSON.stringify(p)).toString("base64url");
}

export function decodeSessionPayload(str: string): SessionPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(str, "base64url").toString("utf8"));
    if (typeof parsed?.uid === "string" && typeof parsed?.exp === "number") {
      return parsed as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate a signed token value and return its uid, or null if invalid/expired.
 */
export async function readSessionValue(value: string | undefined | null): Promise<string | null> {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadStr = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!(await verifyToken(payloadStr, sig))) return null;
  const payload = decodeSessionPayload(payloadStr);
  if (!payload) return null;
  if (payload.exp < Date.now()) return null;
  return payload.uid;
}
