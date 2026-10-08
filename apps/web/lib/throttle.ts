import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Best-effort client IP for abuse damping. Behind a proxy/CDN this reads the
 * standard forwarding headers; in dev they're absent and we fall back to a
 * shared bucket.
 */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    const real = h.get("x-real-ip");
    if (real) return real.trim();
  } catch {
    // headers() outside a request scope
  }
  return "unknown";
}

/**
 * Consume one hit from `scope` for the current client.
 * Returns null when allowed, or a user-facing error when throttled.
 */
export async function throttle(scope: string, limit: number, windowMs: number): Promise<string | null> {
  const ip = await getClientIp();
  const result = rateLimit(`${scope}:${ip}`, limit, windowMs);
  if (result.ok) return null;
  return `Too many attempts — please wait ${result.retryAfterSeconds}s and try again.`;
}

/** Throttle helper for places that already know the identity (e.g. email). */
export function throttleKey(scope: string, identity: string, limit: number, windowMs: number): string | null {
  const result = rateLimit(`${scope}:${identity.toLowerCase()}`, limit, windowMs);
  if (result.ok) return null;
  return `Too many attempts — please wait ${result.retryAfterSeconds}s and try again.`;
}
