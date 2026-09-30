import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addItemToCart, getCartBySession, getOrCreateCart } from "@/modules/ecommerce/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CART_COOKIE = "canopy_cart";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const SESSION_ID_RE = /^[A-Za-z0-9_-]{10,64}$/;

/** Stable per-browser cart id — anonymous carts are keyed by this cookie. */
async function readCartSession(): Promise<{ sessionId: string; isNew: boolean }> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing && SESSION_ID_RE.test(existing)) return { sessionId: existing, isNew: false };
  return { sessionId: crypto.randomUUID(), isNew: true };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      productId?: string;
      quantity?: number;
    } | null;

    const productId = body?.productId?.trim();
    if (!productId) {
      return NextResponse.json({ ok: false, error: "Missing product." }, { status: 400 });
    }

    const quantity = Math.min(99, Math.max(1, Math.round(body?.quantity ?? 1)));
    const { sessionId, isNew } = await readCartSession();

    const cart = await getOrCreateCart(sessionId);
    const result = await addItemToCart(cart.id, productId, quantity);
    const itemCount = result.ok ? (await getCartBySession(sessionId))?.itemCount ?? 0 : cart.itemCount;

    const response = NextResponse.json({
      ok: result.ok,
      error: result.error,
      itemCount,
    });

    if (isNew && result.ok) {
      response.cookies.set(CART_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: CART_COOKIE_MAX_AGE,
      });
    }

    return result.ok
      ? response
      : NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to add to cart." },
      { status: 500 },
    );
  }
}
