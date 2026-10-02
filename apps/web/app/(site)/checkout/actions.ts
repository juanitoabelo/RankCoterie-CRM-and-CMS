"use server";

import Stripe from "stripe";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { isStripeConfigured, readStripeConfig } from "@/lib/billing/checkout";
import { createPaypalOrder, isPaypalConfigured, readPaypalConfig } from "@/lib/billing/paypal";
import { createSquarePaymentLink, isSquareConfigured, readSquareConfig } from "@/lib/billing/square";
import {
  allocateToLines,
  quoteTotals,
  resolveCoupon,
  round2,
  type QuoteLine,
  type QuoteTotals,
} from "@/lib/billing/totals";
import { reserveStock, restoreStockForOrder } from "@/lib/billing/stock";
import {
  adjustCouponUsage,
  releaseOrderCoupon,
  releasePendingOrder,
} from "@/lib/billing/pending-orders";
import { getCartBySession } from "@/modules/ecommerce/queries";
import { readExistingCartSession } from "@/lib/cart-session";
import { getSessionUid } from "@/modules/auth/session";

export type PurchaseResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export type CouponActionResult = { ok: true } | { ok: false; error: string };

export type QuoteResult = { ok: true; totals: QuoteTotals } | { ok: false; error: string };

type ProductRow = NonNullable<Awaited<ReturnType<typeof prisma.product.findFirst>>>;

type LineItem = {
  productId: string;
  name: string;
  sku: string | null;
  type: ProductRow["type"];
  quantity: number;
  unitPrice: number;
  saleItem: boolean;
  shippingRequired: boolean;
};

type Address = {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
};

/** Merge a patch into an order's meta JSON without dropping existing keys. */
async function mergeOrderMeta(orderId: string, patch: Record<string, unknown>): Promise<void> {
  const current = await prisma.order.findUnique({ where: { id: orderId }, select: { meta: true } });
  const meta = (current?.meta ?? {}) as Record<string, unknown>;
  await prisma.order.update({
    where: { id: orderId },
    data: { meta: { ...meta, ...patch } as Prisma.InputJsonValue },
  });
}

function saleActive(product: ProductRow): boolean {
  const now = new Date();
  return (
    product.salePrice !== null &&
    (!product.salePriceStart || product.salePriceStart <= now) &&
    (!product.salePriceEnd || product.salePriceEnd >= now)
  );
}

/** Accept only well-formed client tokens (they end up in a unique index). */
function normalizeCheckoutToken(raw: unknown): string | null {
  const token = String(raw ?? "").trim();
  return /^[A-Za-z0-9-]{8,64}$/.test(token) ? token : null;
}

type OrderWithItems = NonNullable<Awaited<ReturnType<typeof findOrderByToken>>>;

async function findOrderByToken(token: string) {
  return prisma.order.findFirst({
    where: { tenantId: TENANT_ID, meta: { path: ["checkoutToken"], equals: token } },
    include: { items: true },
  });
}

/** Does a token-matching order represent this exact checkout attempt? */
function orderMatchesAttempt(
  order: OrderWithItems,
  items: LineItem[],
  totals: QuoteTotals,
  gatewayId: string,
  address: Address,
): boolean {
  if (order.paymentGatewayId !== gatewayId) return false;
  if (Math.abs(order.total - totals.total) > 0.011) return false;
  if (order.items.length !== items.length) return false;
  // A changed shipping address is a different attempt — release and re-create.
  if ((order.billingAddress1 ?? "") !== address.address1) return false;
  if ((order.billingCity ?? "") !== address.city) return false;
  if ((order.billingPostcode ?? "") !== address.postcode) return false;
  if ((order.billingCountry ?? "") !== address.country) return false;
  if ((order.billingFirstName ?? "") !== address.firstName) return false;
  if ((order.billingLastName ?? "") !== address.lastName) return false;
  const sortedOrder = [...order.items].sort((a, b) => a.productId.localeCompare(b.productId));
  const sortedNew = [...items].sort((a, b) => a.productId.localeCompare(b.productId));
  return sortedOrder.every((o, i) => o.productId === sortedNew[i].productId && o.quantity === sortedNew[i].quantity);
}

/**
 * Cancel a stale/abandoned order and hand its reservations back.
 * Claim-first, so calling this twice is safe.
 */
async function releaseStaleOrder(orderId: string): Promise<void> {
  await releasePendingOrder(orderId, "superseded-by-retry").catch(() => {});
}

/** Cancel abandoned PENDING orders from earlier attempts of the same cart checkout. */
async function supersedeCartOrders(sessionId: string): Promise<void> {
  const stale = await prisma.order.findMany({
    where: {
      tenantId: TENANT_ID,
      status: "PENDING",
      paymentStatus: "PENDING",
      meta: { path: ["cartSessionId"], equals: sessionId },
    },
    select: { id: true },
  });
  for (const row of stale) await releaseStaleOrder(row.id);
}

function newOrderNumber(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CNP-${Date.now().toString(36).toUpperCase()}${rand}`;
}

/** Resolve the requested gateway — must be enabled for this store. */
async function resolveGateway(gatewayId: string) {
  const gateway = await prisma.paymentGateway.findFirst({
    where: { id: gatewayId, tenantId: TENANT_ID, isEnabled: true },
  });
  if (!gateway) {
    return {
      ok: false as const,
      error: "That payment method is no longer available. Please choose another.",
    };
  }

  // Fail fast on gateways that cannot process payment right now — before
  // any order is created, so no orphan orders are left behind.
  if (gateway.type === "STRIPE" && !isStripeConfigured(gateway.config)) {
    return {
      ok: false as const,
      error: "Stripe is not configured yet — add your Stripe keys under Configure Payment Gateway.",
    };
  }
  if (gateway.type === "PAYPAL" && !isPaypalConfigured(gateway.config)) {
    return {
      ok: false as const,
      error: "PayPal is not configured yet — add your PayPal credentials under Configure Payment Gateway.",
    };
  }
  if (gateway.type === "SQUARE" && !isSquareConfigured(gateway.config)) {
    return {
      ok: false as const,
      error: "Square is not configured yet — add your Square credentials (application ID, access token, location ID) under Configure Payment Gateway.",
    };
  }
  return { ok: true as const, gateway };
}

/** Load products, validate availability/stock, and price each line (sale-aware). */
async function buildLineItems(
  raw: { productId: string; quantity: number }[],
): Promise<{ ok: true; items: LineItem[]; total: number } | { ok: false; error: string }> {
  if (raw.length === 0) return { ok: false, error: "Your cart is empty." };

  const products = await prisma.product.findMany({
    where: { id: { in: raw.map((r) => r.productId) }, tenantId: TENANT_ID },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const items: LineItem[] = [];
  for (const line of raw) {
    const product = byId.get(line.productId);
    if (!product || product.status !== "PUBLISHED" || product.visibility !== "PUBLIC") {
      return { ok: false, error: "One or more products in your order are no longer available." };
    }
    if (product.stockStatus === "OUT_OF_STOCK") {
      return { ok: false, error: `“${product.name}” is out of stock.` };
    }
    if (
      product.manageStock &&
      product.stockQuantity !== null &&
      product.stockQuantity < line.quantity
    ) {
      return { ok: false, error: `Only ${product.stockQuantity} of “${product.name}” left in stock.` };
    }

    const onSale = saleActive(product);
    const unitPrice = onSale && product.salePrice !== null ? product.salePrice : product.regularPrice;

    items.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      type: product.type,
      quantity: line.quantity,
      unitPrice,
      saleItem: onSale,
      shippingRequired: product.shippingRequired,
    });
  }

  const total = round2(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
  return { ok: true, items, total };
}

function toQuoteLines(items: LineItem[]): QuoteLine[] {
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    saleItem: item.saleItem,
    shippingRequired: item.shippingRequired,
  }));
}

/** Create the Order + OrderItem rows with the full totals breakdown. */
async function createOrder(
  items: LineItem[],
  totals: QuoteTotals,
  gateway: { id: string; name: string; type: string },
  email: string | null,
  address: Address,
  checkoutToken: string | null,
  cartSessionId: string | null,
) {
  const lineTotals = items.map((item) => round2(item.unitPrice * item.quantity));
  const { lineDiscount, lineTax } = allocateToLines(
    lineTotals.map((t) => ({ lineTotal: t })),
    totals,
  );

  // Attach the signed-in user (null for guest checkout) so orders appear in
  // account history and are covered by user-scoped queries.
  const userId = await getSessionUid().catch(() => null);

  return prisma.order.create({
    data: {
      tenantId: TENANT_ID,
      orderNumber: newOrderNumber(),
      userId,
      guestEmail: email,
      currency: "USD",
      subtotal: totals.subtotal,
      discountTotal: totals.discount,
      shippingTotal: totals.shipping,
      taxTotal: totals.tax,
      total: totals.total,
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentGatewayId: gateway.id,
      paymentMethod: gateway.type,
      paymentMethodTitle: gateway.name,
      shippingMethod: totals.shippingLabel,
      billingFirstName: address.firstName || null,
      billingLastName: address.lastName || null,
      billingCompany: address.company || null,
      billingAddress1: address.address1 || null,
      billingAddress2: address.address2 || null,
      billingCity: address.city || null,
      billingState: address.state || null,
      billingPostcode: address.postcode || null,
      billingCountry: address.country || null,
      billingPhone: address.phone || null,
      billingEmail: email,
      // Single-address checkout: shipping mirrors billing.
      shippingFirstName: address.firstName || null,
      shippingLastName: address.lastName || null,
      shippingCompany: address.company || null,
      shippingAddress1: address.address1 || null,
      shippingAddress2: address.address2 || null,
      shippingCity: address.city || null,
      shippingState: address.state || null,
      shippingPostcode: address.postcode || null,
      shippingCountry: address.country || null,
      shippingPhone: address.phone || null,
      customerNote: null,
      meta: {
        ...(totals.coupon ? { couponCode: totals.coupon.code } : {}),
        taxRate: totals.taxRate,
        ...(checkoutToken ? { checkoutToken } : {}),
        ...(cartSessionId ? { cartSessionId } : {}),
      },
      items: {
        create: items.map((item, i) => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          type: item.type,
          quantity: item.quantity,
          price: item.unitPrice,
          lineSubtotal: lineTotals[i],
          lineSubtotalTax: lineTax[i],
          lineTotal: round2(lineTotals[i] - lineDiscount[i]),
          lineTax: lineTax[i],
          taxRate: totals.taxRate > 0 ? totals.taxRate : null,
        })),
      },
    },
  });
}

/** Send the customer to the gateway's payment flow (order already created). */
async function startPayment(
  order: { id: string; orderNumber: string },
  items: LineItem[],
  totals: QuoteTotals,
  productSlugForCancel: string | null,
  gateway: { name: string; type: string; config: unknown },
): Promise<PurchaseResult> {
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const cancelUrl = productSlugForCancel
    ? `${siteUrl}/checkout/cancel?orderId=${order.id}`
    : `${siteUrl}/checkout/cancel?orderId=${order.id}`;

  const rollback = async () => {
    await restoreStockForOrder(order.id).catch(() => {});
    await releaseOrderCoupon(order.id).catch(() => {});
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
  };

  if (gateway.type === "STRIPE") {
    const stripeConfig = readStripeConfig(gateway.config);
    if (!stripeConfig) {
      await rollback();
      return { ok: false, error: "Stripe is not configured yet." };
    }
    try {
      const stripe = new Stripe(stripeConfig.secretKey);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(item.unitPrice * 100),
            product_data: { name: item.name },
          },
        })),
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
        success_url: `${siteUrl}/checkout/success?orderId=${order.id}`,
        cancel_url: cancelUrl,
      });
      if (!session.url) throw new Error("Stripe did not return a checkout URL.");
      // Recorded for admin refunds (refundOrderPayment resolves the payment intent from it).
      await mergeOrderMeta(order.id, { stripeSessionId: session.id });
      return { ok: true, url: session.url };
    } catch (e) {
      await rollback();
      return { ok: false, error: e instanceof Error ? e.message : "Stripe checkout failed." };
    }
  }

  if (gateway.type === "PAYPAL") {
    const config = readPaypalConfig(gateway.config);
    if (!config) {
      await rollback();
      return { ok: false, error: "PayPal is not configured yet." };
    }
    try {
      const { paypalOrderId, approveUrl } = await createPaypalOrder({
        config,
        amount: totals.total.toFixed(2),
        description: `Order ${order.orderNumber}`,
        referenceId: order.id,
        returnUrl: `${siteUrl}/checkout/paypal/return`,
        cancelUrl: cancelUrl,
      });
      await mergeOrderMeta(order.id, { paypalOrderId });
      return { ok: true, url: approveUrl };
    } catch (e) {
      await rollback();
      return { ok: false, error: e instanceof Error ? e.message : "PayPal checkout failed." };
    }
  }

  if (gateway.type === "SQUARE") {
    const config = readSquareConfig(gateway.config);
    if (!config) {
      await rollback();
      return { ok: false, error: "Square is not configured yet." };
    }
    try {
      const link = await createSquarePaymentLink({
        config,
        amount: totals.total,
        orderNumber: order.orderNumber,
        reference: order.id,
        redirectUrl: `${siteUrl}/checkout/square/return?reference=${order.id}`,
      });
      if (!link.ok) throw new Error(link.error);
      await mergeOrderMeta(order.id, {
        squarePaymentLinkId: link.paymentLinkId,
        squareOrderId: link.squareOrderId,
      });
      return { ok: true, url: link.url };
    } catch (e) {
      await rollback();
      return { ok: false, error: e instanceof Error ? e.message : "Square checkout failed." };
    }
  }

  if (gateway.type === "MANUAL") {
    // Cash-on-delivery / offline payment — order is placed immediately.
    return { ok: true, url: `/checkout/success?orderId=${order.id}` };
  }

  return { ok: true, url: `/checkout/success?orderId=${order.id}&awaiting=1` };
}

/** Shared tail: reuse-or-create the order idempotently, reserve stock, start payment. */
async function placeOrder(
  lines: { ok: true; items: LineItem[] } | { ok: false; error: string },
  totalsResult: Promise<QuoteTotals>,
  gatewayResult: { ok: true; gateway: { id: string; name: string; type: string; config: unknown } } | { ok: false; error: string },
  email: string | null,
  address: Address,
  productSlugForCancel: string | null,
  checkoutToken: string | null,
  cartSessionId: string | null,
): Promise<PurchaseResult> {
  if (!lines.ok) return lines;
  if (!gatewayResult.ok) return gatewayResult;

  const totals = await totalsResult;
  if (totals.couponError) return { ok: false, error: totals.couponError };

  // Shipping orders need a deliverable address; digital-only orders don't.
  const requiresShipping = lines.items.some((item) => item.shippingRequired);
  const addressError = validateAddress(address, requiresShipping);
  if (addressError) return { ok: false, error: addressError };

  // ── Idempotency: a re-submit (double click, back button, flaky network)
  //    with the same checkout token reuses the order it already created.
  if (checkoutToken) {
    const existing = await findOrderByToken(checkoutToken);
    if (existing) {
      if (existing.paymentStatus === "PAID" || existing.status === "COMPLETED") {
        return { ok: true, url: `/checkout/success?orderId=${existing.id}` };
      }
      if (existing.status === "PENDING" && orderMatchesAttempt(existing, lines.items, totals, gatewayResult.gateway.id, address)) {
        // Same attempt in flight — skip stock reservation and order creation,
        // just restart the gateway flow (fresh session/URL) on the same order.
        return startPayment(existing, lines.items, totals, productSlugForCancel, gatewayResult.gateway);
      }
      // Stale attempt for this token (cart/gateway changed) — release it so
      // the token is free for the new order below.
      await releaseStaleOrder(existing.id);
      await prisma.order.delete({ where: { id: existing.id } }).catch(() => {});
    }
  }

  // ── Cart checkouts also supersede abandoned attempts from earlier pages
  //    (different token, same cart) so they don't hold stock forever.
  if (cartSessionId) await supersedeCartOrders(cartSessionId);

  const stock = await reserveStock(lines.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
  if (!stock.ok) return stock;

  let order;
  try {
    order = await createOrder(lines.items, totals, gatewayResult.gateway, email, address, checkoutToken, cartSessionId);
  } catch (e) {
    // Order creation failed — give the reserved stock back.
    await restoreStockForOrderFallback(lines.items);
    // Lost a race with a concurrent submit of the same token: the winner
    // created the order, so reuse it instead of erroring.
    const code = (e as { code?: string }).code;
    if (checkoutToken && code === "P2002") {
      const winner = await findOrderByToken(checkoutToken).catch(() => null);
      if (winner && winner.status === "PENDING") {
        return startPayment(winner, lines.items, totals, productSlugForCancel, gatewayResult.gateway);
      }
      return { ok: true, url: `/checkout/success?orderId=${winner?.id ?? ""}` };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Could not create your order." };
  }

  // Consume one coupon usage now that the order exists (limits are checked
  // at quote time, so this makes usedCount authoritative). Released again if
  // the order is later deleted/cancelled before payment (releaseOrderCoupon).
  if (totals.coupon) await adjustCouponUsage(totals.coupon.code, 1);

  return startPayment(order, lines.items, totals, productSlugForCancel, gatewayResult.gateway);
}

/** Restore stock directly from line items (used when no order row exists yet). */
async function restoreStockForOrderFallback(items: LineItem[]): Promise<void> {
  for (const item of items) {
    await prisma.product
      .updateMany({
        where: { id: item.productId, tenantId: TENANT_ID, manageStock: true },
        data: { stockQuantity: { increment: item.quantity } },
      })
      .catch(() => {});
  }
}

function readAddress(formData: FormData): Address {
  const str = (key: string) =>
    String(formData.get(key) ?? "").trim().slice(0, 200);
  return {
    firstName: str("firstName"),
    lastName: str("lastName"),
    company: str("company").slice(0, 120),
    address1: str("address1"),
    address2: str("address2").slice(0, 200),
    city: str("city"),
    state: str("state").slice(0, 64),
    postcode: str("postcode").slice(0, 32),
    country: str("country").slice(0, 2).toUpperCase(),
    phone: str("phone").slice(0, 40),
  };
}

/**
 * Validate the address for orders that need shipping. Digital-only orders
 * skip the street-address requirement (country still drives tax).
 */
function validateAddress(address: Address, requiresShipping: boolean): string | null {
  if (!requiresShipping) return null;
  const missing: string[] = [];
  if (!address.firstName) missing.push("first name");
  if (!address.lastName) missing.push("last name");
  if (!address.address1) missing.push("street address");
  if (!address.city) missing.push("city");
  if (!address.postcode) missing.push("postal code");
  if (!address.country) missing.push("country");
  if (missing.length > 0) return `Please enter your ${missing.join(", ")}.`;
  return null;
}

/** Buy now from the single product page. */
export async function purchaseProduct(formData: FormData): Promise<PurchaseResult> {
  const productId = String(formData.get("productId") ?? "").trim();
  const gatewayId = String(formData.get("gatewayId") ?? "").trim();
  const quantity = Math.min(999, Math.max(1, parseInt(String(formData.get("quantity") ?? "1"), 10) || 1));
  const email = String(formData.get("email") ?? "").trim() || null;
  const couponCode = String(formData.get("couponCode") ?? "").trim() || null;
  const checkoutToken = normalizeCheckoutToken(formData.get("checkoutToken"));

  if (!productId) return { ok: false, error: "Missing product." };
  if (!gatewayId) return { ok: false, error: "Please choose a payment method." };

  const gatewayResult = await resolveGateway(gatewayId);
  if (!gatewayResult.ok) return gatewayResult;

  const lines = await buildLineItems([{ productId, quantity }]);
  if (!lines.ok) return lines;

  const address = readAddress(formData);
  const totals = quoteTotals({
    lines: toQuoteLines(lines.items),
    couponCode,
    country: address.country,
    state: address.state,
  });

  return placeOrder(lines, totals, gatewayResult, email, address, null, checkoutToken, null);
}

/** Place an order for everything in the cart. */
export async function checkoutCart(formData: FormData): Promise<PurchaseResult> {
  const gatewayId = String(formData.get("gatewayId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const checkoutToken = normalizeCheckoutToken(formData.get("checkoutToken"));

  if (!gatewayId) return { ok: false, error: "Please choose a payment method." };
  // Email is how guests look up their order later.
  if (!email) return { ok: false, error: "Please enter your email address." };

  const sessionId = await readExistingCartSession();
  const cart = sessionId ? await getCartBySession(sessionId) : null;
  if (!cart || cart.items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const gatewayResult = await resolveGateway(gatewayId);
  if (!gatewayResult.ok) return gatewayResult;

  const lines = await buildLineItems(
    cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
  );
  if (!lines.ok) return lines;

  const address = readAddress(formData);
  const totals = quoteTotals({
    lines: toQuoteLines(lines.items),
    couponCode: cart.couponCode,
    country: address.country,
    state: address.state,
  });

  return placeOrder(lines, totals, gatewayResult, email, address, null, checkoutToken, sessionId);
}

/** Apply a coupon code to the current cart (validated immediately). */
export async function applyCouponToCart(formData: FormData): Promise<CouponActionResult> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { ok: false, error: "Enter a coupon code." };

  const sessionId = await readExistingCartSession();
  const cart = sessionId ? await getCartBySession(sessionId) : null;
  if (!cart || cart.items.length === 0) return { ok: false, error: "Your cart is empty." };

  const lines: QuoteLine[] = cart.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.quantity > 0 ? round2(item.lineTotal / item.quantity) : item.lineTotal,
    saleItem: item.product.salePrice !== null,
    shippingRequired: item.product.shippingRequired !== false,
  }));
  const subtotal = round2(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));

  const result = await resolveCoupon(code, lines, subtotal);
  if (!result.ok) return { ok: false, error: result.error };

  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponCode: result.coupon.code },
  });
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: true };
}

/** Remove the coupon from the current cart. */
export async function removeCouponFromCart(): Promise<CouponActionResult> {
  const sessionId = await readExistingCartSession();
  const cart = sessionId ? await getCartBySession(sessionId) : null;
  if (!cart) return { ok: false, error: "No cart found." };

  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponCode: null },
  });
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: true };
}

/** Live totals quote for the checkout form (country/state change → tax/shipping update). */
export async function quoteCartTotals(formData: FormData): Promise<QuoteResult> {
  const sessionId = await readExistingCartSession();
  const cart = sessionId ? await getCartBySession(sessionId) : null;
  if (!cart || cart.items.length === 0) return { ok: false, error: "Your cart is empty." };

  const lines: QuoteLine[] = cart.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.quantity > 0 ? round2(item.lineTotal / item.quantity) : item.lineTotal,
    saleItem: item.product.salePrice !== null,
    shippingRequired: item.product.shippingRequired !== false,
  }));

  const totals = await quoteTotals({
    lines,
    couponCode: cart.couponCode,
    country: String(formData.get("country") ?? "").trim() || null,
    state: String(formData.get("state") ?? "").trim() || null,
  });
  return { ok: true, totals };
}
