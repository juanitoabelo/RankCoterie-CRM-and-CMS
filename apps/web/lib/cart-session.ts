import { cookies } from "next/headers";

export const CART_COOKIE = "canopy_cart";
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const SESSION_ID_RE = /^[A-Za-z0-9_-]{10,64}$/;

/**
 * Stable per-browser cart id — anonymous carts are keyed by this cookie.
 * Generates a new session id when absent/invalid; the caller must persist it
 * on the response (`isNew` tells it when to set the cookie).
 */
export async function readCartSession(): Promise<{ sessionId: string; isNew: boolean }> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing && SESSION_ID_RE.test(existing)) return { sessionId: existing, isNew: false };
  return { sessionId: crypto.randomUUID(), isNew: true };
}

/** Read-only variant: returns null when there is no valid cart cookie. */
export async function readExistingCartSession(): Promise<string | null> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  return existing && SESSION_ID_RE.test(existing) ? existing : null;
}

/** Cookie options shared by every set of the cart cookie. */
export function cartCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  };
}
