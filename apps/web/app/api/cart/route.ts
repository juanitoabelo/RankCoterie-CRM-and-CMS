import { NextResponse } from "next/server";
import {
  addItemToCart,
  getCartBySession,
  getOrCreateCart,
  removeItemFromCart,
  updateCartItemQuantity,
} from "@/modules/ecommerce/queries";
import {
  CART_COOKIE,
  cartCookieOptions,
  readCartSession,
  readExistingCartSession,
} from "@/lib/cart-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SerializedItem = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  imageAssetId: string | null;
  price: number;
  quantity: number;
  lineTotal: number;
  stockStatus: string;
};

function serializeCart(cart: Awaited<ReturnType<typeof getCartBySession>>) {
  if (!cart) {
    return { itemCount: 0, total: 0, items: [] as SerializedItem[] };
  }
  return {
    itemCount: cart.itemCount,
    total: cart.total,
    items: cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      slug: item.product.slug,
      imageAssetId: item.product.images[0]?.assetId ?? null,
      price: item.price,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      stockStatus: item.product.stockStatus,
    })),
  };
}

/** Read the current cart (empty payload when there is no cart cookie). */
export async function GET() {
  try {
    const sessionId = await readExistingCartSession();
    if (!sessionId) return NextResponse.json({ ok: true, ...serializeCart(null) });
    const cart = await getCartBySession(sessionId);
    return NextResponse.json({ ok: true, ...serializeCart(cart) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load cart." },
      { status: 500 },
    );
  }
}

/** Add an item to the cart. */
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
      response.cookies.set(CART_COOKIE, sessionId, cartCookieOptions());
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

/** Update an item's quantity (quantity 0 removes it). */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      itemId?: string;
      quantity?: number;
    } | null;

    const itemId = body?.itemId?.trim();
    if (!itemId) {
      return NextResponse.json({ ok: false, error: "Missing item." }, { status: 400 });
    }

    const sessionId = await readExistingCartSession();
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Cart not found." }, { status: 404 });
    }

    const cart = await getCartBySession(sessionId);
    if (!cart) {
      return NextResponse.json({ ok: false, error: "Cart not found." }, { status: 404 });
    }

    const quantity = Math.min(99, Math.max(0, Math.round(body?.quantity ?? 1)));
    const result = await updateCartItemQuantity(cart.id, itemId, quantity);
    const updated = await getCartBySession(sessionId);

    return result.ok
      ? NextResponse.json({ ok: true, ...serializeCart(updated) })
      : NextResponse.json(result, { status: 409 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to update cart." },
      { status: 500 },
    );
  }
}

/** Remove an item from the cart. */
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const body = (await request.json().catch(() => null)) as { itemId?: string } | null;
    const itemId = (body?.itemId ?? url.searchParams.get("itemId") ?? "").trim();
    if (!itemId) {
      return NextResponse.json({ ok: false, error: "Missing item." }, { status: 400 });
    }

    const sessionId = await readExistingCartSession();
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Cart not found." }, { status: 404 });
    }

    const cart = await getCartBySession(sessionId);
    if (!cart) {
      return NextResponse.json({ ok: false, error: "Cart not found." }, { status: 404 });
    }

    const result = await removeItemFromCart(cart.id, itemId);
    const updated = await getCartBySession(sessionId);

    return result.ok
      ? NextResponse.json({ ok: true, ...serializeCart(updated) })
      : NextResponse.json(result, { status: 409 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to remove item." },
      { status: 500 },
    );
  }
}
