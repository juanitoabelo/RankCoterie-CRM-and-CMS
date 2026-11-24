import { NextResponse } from "next/server";
import { round2 } from "@/lib/billing/totals";
import {
  addItemToCart,
  getCartBySession,
  getOrCreateCart,
  getPurchasableProductType,
  removeItemFromCart,
  updateCartItemQuantity,
} from "@/modules/ecommerce/queries";
import { logCartAddFailure } from "@/lib/checkout/funnel-events";
import {
  CART_COOKIE,
  cartCookieOptions,
  readCartSession,
  readExistingCartSession,
} from "@/lib/cart-session";
import {
  isPurchasableProductType,
  normalizeCartOptions,
  parseCartQuantity,
  repriceCartItem,
  resolveStockSource,
} from "@/modules/ecommerce/cart-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SerializedItem = {
  id: string;
  productId: string;
  variantId: string | null;
  variantName: string | null;
  options: Record<string, string>;
  name: string;
  slug: string;
  imageAssetId: string | null;
  price: number;
  quantity: number;
  lineTotal: number;
  stockStatus: string;
  manageStock: boolean;
  stockQuantity: number | null;
  backorders: string;
  lowStockAmount: number | null;
  variantLowStockAmount: number | null;
};

type BundleChildInput = {
  productId: string;
  quantity: number;
  variantId?: string | null;
  name?: string | null;
  sku?: string | null;
};

function readBundleChildren(value: unknown): BundleChildInput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const productId = typeof record.productId === "string" ? record.productId.trim() : "";
    const quantity = Math.max(1, Math.floor(Number(record.quantity ?? 1)));
    if (!productId || !Number.isFinite(quantity)) return [];
    return [{
      productId,
      quantity,
      variantId: typeof record.variantId === "string" ? record.variantId : null,
      name: typeof record.name === "string" ? record.name : null,
      sku: typeof record.sku === "string" ? record.sku : null,
    }];
  }).slice(0, 100);
}

function serializeCart(cart: Awaited<ReturnType<typeof getCartBySession>>) {
  if (!cart) {
    return { itemCount: 0, total: 0, items: [] as SerializedItem[] };
  }

  const items = cart.items.map((item) => repriceCartItem(item));
  return {
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: round2(items.reduce((sum, item) => sum + item.lineTotal, 0)),
    items: items.map((item) => {
      const stockSource = resolveStockSource(item.variant, item.product);
      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        variantName: item.variant?.name ?? null,
        options: (() => {
          const raw = item.meta && typeof item.meta === "object"
            ? normalizeCartOptions((item.meta as Record<string, unknown>).customOptions)
            : {};
          const visible = { ...raw };
          delete visible.__bundleChildren;
          return visible;
        })(),
        name: item.product.name,
        slug: item.product.slug,
        imageAssetId:
          item.variant?.imageAsset?.id ?? item.product.images[0]?.assetId ?? null,
        price: item.price,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        stockStatus: stockSource.stockStatus ?? item.product.stockStatus,
        manageStock: stockSource.manageStock,
        stockQuantity: stockSource.stockQuantity,
        backorders: stockSource.backorders ?? item.product.backorders,
        lowStockAmount: item.product.lowStockAmount,
        variantLowStockAmount: item.variant?.lowStockAmount ?? null,
      };
    }),
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
  let attemptedProductId: string | undefined;
  try {
    const body = (await request.json().catch(() => null)) as {
      productId?: string;
      variantId?: string | null;
      options?: Record<string, unknown>;
      quantity?: number;
      bundleChildren?: unknown;
    } | null;

    const productId = body?.productId?.trim();
    attemptedProductId = productId;
    if (!productId) {
      return NextResponse.json({ ok: false, error: "Missing product." }, { status: 400 });
    }

    const productType = await getPurchasableProductType(productId);
    if (!productType) {
      logCartAddFailure({ productId, reason: "PRODUCT_NOT_FOUND" });
      return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
    }
    if (!isPurchasableProductType(productType.type)) {
      logCartAddFailure({ productId, reason: "UNSUPPORTED_PRODUCT_TYPE" });
      return NextResponse.json(
        { ok: false, error: "This product must be purchased from its own product page." },
        { status: 409 },
      );
    }

    const quantity = parseCartQuantity(body?.quantity ?? 1);
    if (quantity === null) {
      logCartAddFailure({ productId, reason: "INVALID_QUANTITY" });
      return NextResponse.json({ ok: false, error: "Invalid quantity." }, { status: 400 });
    }
    const { sessionId, isNew } = await readCartSession();

    const cart = await getOrCreateCart(sessionId);
    const variantId = typeof body?.variantId === "string" ? body.variantId : null;
    const result = await addItemToCart(
      cart.id,
      productId,
      quantity,
        variantId ?? undefined,
        normalizeCartOptions(body?.options),
        readBundleChildren(body?.bundleChildren),
      );

    const updated = result.ok ? await getCartBySession(sessionId) : null;
    const itemCount = updated?.itemCount ?? cart.itemCount;

    const response = NextResponse.json({
      ok: result.ok,
      error: result.error,
      warning: result.warning,
      ...(updated ? serializeCart(updated) : { itemCount, total: 0, items: [] }),
    });

    if (isNew && result.ok) {
      response.cookies.set(CART_COOKIE, sessionId, cartCookieOptions());
    }

    if (!result.ok) {
      logCartAddFailure({ productId, reason: result.error ?? "ADD_FAILED" });
    }
    return result.ok
      ? response
      : NextResponse.json({ ok: false, error: result.error, warning: result.warning }, { status: 409 });
  } catch (e) {
    logCartAddFailure({ productId: attemptedProductId, reason: e instanceof Error ? e.message : "EXCEPTION" });
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

    const quantity = parseCartQuantity(body?.quantity ?? 1, 0);
    if (quantity === null) {
      return NextResponse.json({ ok: false, error: "Invalid quantity." }, { status: 400 });
    }
    const result = await updateCartItemQuantity(cart.id, itemId, quantity);
    const updated = await getCartBySession(sessionId);

    return result.ok
      ? NextResponse.json({ ok: true, ...serializeCart(updated), warning: result.warning })
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
