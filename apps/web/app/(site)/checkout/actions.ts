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
import {
  buildSubscriptionPlan,
  getCartBySession,
  type SubscriptionPlanSnapshot,
} from "@/modules/ecommerce/queries";
import {
  isPurchasableProductType,
  matchCartVariant,
  normalizeCartOptions,
  resolveCartLinePricing,
  resolveStockSource,
} from "@/modules/ecommerce/cart-pricing";
import { STORE_CURRENCY } from "@/modules/ecommerce/currency";
import { readExistingCartSession } from "@/lib/cart-session";
import { getSessionUid } from "@/modules/auth/session";
import {
  findServiceBookingConflict,
  parseServiceBooking,
  type ServiceBooking,
} from "@/lib/checkout/service-booking";
import { createOrderAccessToken } from "@/lib/checkout/order-access";
import { logOrderCreated } from "@/lib/checkout/funnel-events";
import {
  addressMeta,
  readCheckoutAddresses,
  taxAddress,
  validateCheckoutAddresses,
  type CheckoutAddress,
  type CheckoutAddresses,
} from "@/lib/checkout/addresses";
import { buildStripeOrderSessionParams } from "@/lib/checkout/stripe-order";
import { throttle } from "@/lib/throttle";
import { toOrderEmailData, sendOrderConfirmationEmail } from "@/lib/email/orders";

export type PurchaseResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export type CouponActionResult = { ok: true } | { ok: false; error: string };

export type QuoteResult = { ok: true; totals: QuoteTotals } | { ok: false; error: string };

type ProductRow = NonNullable<Awaited<ReturnType<typeof prisma.product.findFirst>>>;

type LineItem = {
  productId: string;
  variantId: string | null;
  variantName: string | null;
  options: Record<string, string>;
  name: string;
  sku: string | null;
  type: ProductRow["type"];
  quantity: number;
  unitPrice: number;
  saleItem: boolean;
  shippingRequired: boolean;
  taxable: boolean;
  taxClass: string | null;
  shippingClassId: string | null;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  isSignupFee?: boolean;
  couponEligible?: boolean;
  categoryIds: string[];
  bundleChildren?: QuoteLine["bundleChildren"];
  serviceDurationMinutes?: number | null;
  serviceBufferBeforeMinutes?: number | null;
  serviceBufferAfterMinutes?: number | null;
  serviceMaxBookings?: number | null;
  subscriptionPlan?: SubscriptionPlanSnapshot | null;
};

type Address = CheckoutAddress;

/** Merge a patch into an order's meta JSON without dropping existing keys. */
async function mergeOrderMeta(orderId: string, patch: Record<string, unknown>): Promise<void> {
  const current = await prisma.order.findUnique({ where: { id: orderId }, select: { meta: true } });
  const meta = (current?.meta ?? {}) as Record<string, unknown>;
  await prisma.order.update({
    where: { id: orderId },
    data: { meta: { ...meta, ...patch } as Prisma.InputJsonValue },
  });
}

/** Accept only well-formed client tokens (they end up in a unique index). */
function normalizeCheckoutToken(raw: unknown): string | null {
  const token = String(raw ?? "").trim();
  return /^[A-Za-z0-9-]{8,64}$/.test(token) ? token : null;
}

function parseJsonInput(value: unknown): unknown {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
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
  addresses: CheckoutAddresses,
): boolean {
  if (order.paymentGatewayId !== gatewayId) return false;
  if (Math.abs(order.total - totals.total) > 0.011) return false;
  if (order.items.length !== items.length) return false;
  const stored = (prefix: "billing" | "shipping"): Address => ({
    firstName: prefix === "billing" ? (order.billingFirstName ?? "") : (order.shippingFirstName ?? ""),
    lastName: prefix === "billing" ? (order.billingLastName ?? "") : (order.shippingLastName ?? ""),
    company: prefix === "billing" ? (order.billingCompany ?? "") : (order.shippingCompany ?? ""),
    address1: prefix === "billing" ? (order.billingAddress1 ?? "") : (order.shippingAddress1 ?? ""),
    address2: prefix === "billing" ? (order.billingAddress2 ?? "") : (order.shippingAddress2 ?? ""),
    city: prefix === "billing" ? (order.billingCity ?? "") : (order.shippingCity ?? ""),
    state: prefix === "billing" ? (order.billingState ?? "") : (order.shippingState ?? ""),
    postcode: prefix === "billing" ? (order.billingPostcode ?? "") : (order.shippingPostcode ?? ""),
    country: prefix === "billing" ? (order.billingCountry ?? "") : (order.shippingCountry ?? ""),
    phone: prefix === "billing" ? (order.billingPhone ?? "") : (order.shippingPhone ?? ""),
  });
  const addressMatches = (left: Address, right: Address): boolean =>
    left.address1 === right.address1 &&
    left.city === right.city &&
    left.postcode === right.postcode &&
    left.country === right.country &&
    left.firstName === right.firstName &&
    left.lastName === right.lastName;
  if (!addressMatches(stored("billing"), addresses.billing)) return false;
  if (!addressMatches(stored("shipping"), addresses.shipping)) return false;
  const sortedOrder = [...order.items].sort(
    (a, b) => a.productId.localeCompare(b.productId) || (a.variantId ?? "").localeCompare(b.variantId ?? ""),
  );
  const sortedNew = [...items].sort(
    (a, b) => a.productId.localeCompare(b.productId) || (a.variantId ?? "").localeCompare(b.variantId ?? ""),
  );
  return sortedOrder.every(
    (o, i) =>
      o.productId === sortedNew[i].productId &&
      o.variantId === sortedNew[i].variantId &&
      o.quantity === sortedNew[i].quantity,
  );
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

function successUrl(orderId: string, accessToken: string): string {
  const params = new URLSearchParams({ orderId, access: accessToken });
  return `/checkout/success?${params.toString()}`;
}

type OrderAccess = { email: string | null; cartSessionId: string | null; checkoutToken: string | null };

async function orderSuccessUrl(orderId: string, access: OrderAccess): Promise<string> {
  const token = await createOrderAccessToken({
    orderId,
    tenantId: TENANT_ID,
    email: access.email,
    sessionId: access.cartSessionId,
    checkoutToken: access.checkoutToken,
  });
  return successUrl(orderId, token);
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
  if (!["GENERAL", "ECOMMERCE"].includes(String(gateway.purpose))) {
    return {
      ok: false as const,
      error: "That payment method is not available for storefront orders.",
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
  raw: Array<{
    productId: string;
    quantity: number;
    variantId?: string | null;
    options?: unknown;
    bundleChildren?: unknown;
  }>,
  customer?: { email?: string | null; userId?: string | null },
): Promise<{ ok: true; items: LineItem[]; total: number } | { ok: false; error: string }> {
  if (raw.length === 0) return { ok: false, error: "Your cart is empty." };

  const productIds = [...new Set(raw.map((row) => row.productId))];
  const variantIds = [...new Set(raw.map((row) => row.variantId).filter((id): id is string => Boolean(id)))];
  const [products, variants, variantCounts] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, tenantId: TENANT_ID },
      include: {
        categories: { select: { categoryId: true } },
        outgoingLinks: {
          where: { type: "BUNDLE_CHILD" },
          orderBy: { position: "asc" },
          include: {
            linkedProduct: {
              select: {
                id: true,
                name: true,
                sku: true,
                status: true,
                visibility: true,
                stockStatus: true,
                manageStock: true,
                stockQuantity: true,
                backorders: true,
                virtual: true,
                downloadable: true,
                shippingRequired: true,
              },
            },
          },
        },
      },
    }),
    variantIds.length > 0
      ? prisma.productVariant.findMany({ where: { id: { in: variantIds }, productId: { in: productIds } } })
      : Promise.resolve([]),
    prisma.productVariant.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds } },
      _count: { _all: true },
    }),
  ]);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const variantCountByProduct = new Map(
    variantCounts.map((row) => [row.productId, row._count._all]),
  );

  const subscriptionProductIds = products
    .filter((product) => product.type === "SUBSCRIPTION" && (product.subscriptionSignUpFee ?? 0) > 0)
    .map((product) => product.id);
  const subscribedProductIds = new Set<string>();
  if (subscriptionProductIds.length > 0) {
    const userId = customer?.userId ?? (await getSessionUid().catch(() => null));
    const or: Prisma.SubscriptionWhereInput[] = [];
    if (userId) or.push({ customerId: userId });
    if (customer?.email) {
      or.push({ customer: { email: { equals: customer.email, mode: "insensitive" } } });
    }
    if (or.length > 0) {
      const existing = await prisma.subscription.findMany({
        where: { tenantId: TENANT_ID, productId: { in: subscriptionProductIds }, OR: or },
        select: { productId: true },
      });
      for (const row of existing) subscribedProductIds.add(row.productId);
    }
  }

  const items: LineItem[] = [];
  for (const line of raw) {
    const product = productsById.get(line.productId);
    if (!product || product.status !== "PUBLISHED" || product.visibility !== "PUBLIC") {
      return { ok: false, error: "One or more products in your order are no longer available." };
    }
    if (!isPurchasableProductType(product.type)) {
      return {
        ok: false,
        error:
          product.type === "EXTERNAL"
            ? `“${product.name}” must be purchased on the external product site.`
            : `Please choose the individual products included in “${product.name}”.`,
      };
    }

    const options = normalizeCartOptions(line.options);
    const variant = matchCartVariant(variants, product.id, line.variantId);
    if (line.variantId && !variant) {
      const belongsToOtherProduct = variants.some((row) => row.id === line.variantId);
      return {
        ok: false,
        error: belongsToOtherProduct
          ? "The selected option does not belong to its product."
          : "One or more selected options in your order are no longer available.",
      };
    }
    if ((variantCountByProduct.get(product.id) ?? 0) > 0 && !variant) {
      return { ok: false, error: `Please choose an option for “${product.name}”.` };
    }

    const pricing = resolveCartLinePricing(product, variant, line.quantity);
    const stockSource = resolveStockSource(variant, product);
    const stockStatus = stockSource.stockStatus ?? product.stockStatus;
    const backorders = stockSource.backorders ?? product.backorders;
    if (
      stockStatus === "OUT_OF_STOCK" &&
      backorders !== "yes" &&
      backorders !== "notify"
    ) {
      return { ok: false, error: `“${product.name}” is out of stock.` };
    }
    if (pricing.availableStock !== null && line.quantity > pricing.availableStock) {
      return {
        ok: false,
        error: `Only ${pricing.availableStock} of “${product.name}” left in stock.`,
      };
    }

    let bundleChildren: QuoteLine["bundleChildren"];
    if (product.type === "BUNDLE") {
      const children = product.outgoingLinks.map((link) => link.linkedProduct);
      if (children.length === 0) {
        return { ok: false, error: `“${product.name}” has no bundle items configured.` };
      }
      bundleChildren = [];
      for (const child of children) {
        if (child.status !== "PUBLISHED" || child.visibility !== "PUBLIC") {
          return { ok: false, error: `A product in “${product.name}” is no longer available.` };
        }
        const childStock = resolveStockSource(null, child);
        if (
          childStock.stockStatus === "OUT_OF_STOCK" &&
          childStock.backorders !== "yes" &&
          childStock.backorders !== "notify"
        ) {
          return { ok: false, error: `“${child.name}” is out of stock.` };
        }
        if (
          child.manageStock &&
          child.stockQuantity !== null &&
          line.quantity > child.stockQuantity
        ) {
          return { ok: false, error: `Only ${child.stockQuantity} of “${child.name}” left in stock.` };
        }
        bundleChildren.push({
          productId: child.id,
          quantity: line.quantity,
          name: child.name,
          sku: child.sku,
        });
      }
    }

    const variantName =
      variant?.name || Object.values(options).join(" / ") || null;
    const taxStatus = String(product.taxStatus).toUpperCase();
    const subscriptionPlan = buildSubscriptionPlan(
      product,
      variant?.id ?? null,
      pricing.price,
      line.quantity,
      STORE_CURRENCY,
    );
    const item: LineItem = {
      productId: product.id,
      variantId: variant?.id ?? null,
      variantName,
      options,
      name: variantName ? `${product.name} — ${variantName}` : product.name,
      sku: variant?.sku ?? product.sku,
      type: product.type,
      quantity: line.quantity,
      unitPrice: pricing.price,
      saleItem: pricing.onSale,
      shippingRequired: pricing.shippingRequired,
      taxable: taxStatus !== "NONE" && taxStatus !== "NO_TAX",
      taxClass: product.taxClass,
      shippingClassId: product.shippingClassId,
      weight: variant?.weight ?? product.weight,
      length: variant?.length ?? product.length,
      width: variant?.width ?? product.width,
      height: variant?.height ?? product.height,
      categoryIds: product.categories.map((link) => link.categoryId),
      ...(bundleChildren ? { bundleChildren } : {}),
      serviceDurationMinutes: product.serviceDuration ?? null,
      serviceBufferBeforeMinutes: product.serviceBufferBefore ?? null,
      serviceBufferAfterMinutes: product.serviceBufferAfter ?? null,
      serviceMaxBookings: product.serviceMaxBookings ?? null,
      subscriptionPlan,
    };
    items.push(item);

    if (
      subscriptionPlan &&
      subscriptionPlan.signUpFee > 0 &&
      !subscribedProductIds.has(product.id)
    ) {
      items.push({
        ...item,
        variantId: null,
        variantName: null,
        options: {},
        name: `${item.name} — sign-up fee`,
        sku: null,
        quantity: 1,
        unitPrice: round2(subscriptionPlan.signUpFee),
        saleItem: false,
        shippingRequired: false,
        weight: null,
        length: null,
        width: null,
        height: null,
        isSignupFee: true,
        couponEligible: false,
        categoryIds: item.categoryIds,
        subscriptionPlan: null,
      });
    }
  }

  const total = round2(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
  return { ok: true, items, total };
}

function toQuoteLines(items: LineItem[]): QuoteLine[] {
  return items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    saleItem: item.saleItem,
    couponEligible: item.couponEligible !== false,
    taxable: item.taxable,
    taxStatus: item.taxable ? "TAXABLE" : "NONE",
    taxClass: item.taxClass,
    shippingRequired: item.shippingRequired,
    shippingClassId: item.shippingClassId,
    weight: item.weight,
    length: item.length,
    width: item.width,
    height: item.height,
    categoryIds: item.categoryIds,
    ...(item.bundleChildren ? { bundleChildren: item.bundleChildren } : {}),
  }));
}

/** Create the Order + OrderItem rows with the full totals breakdown. */
async function createOrder(
  items: LineItem[],
  totals: QuoteTotals,
  gateway: { id: string; name: string; type: string },
  email: string | null,
  addresses: CheckoutAddresses,
  checkoutToken: string | null,
  cartSessionId: string | null,
  serviceBooking: ServiceBooking | null,
) {
  const lineTotals = items.map((item) => round2(item.unitPrice * item.quantity));
  const manual = gateway.type === "MANUAL";
  const subscriptionPlans = items
    .map((item) => item.subscriptionPlan)
    .filter((plan): plan is SubscriptionPlanSnapshot => Boolean(plan));
  const { lineDiscount, lineTax } = allocateToLines(
    items.map((item, i) => ({
      lineTotal: lineTotals[i],
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      saleItem: item.saleItem,
      couponEligible: item.couponEligible !== false,
      categoryIds: item.categoryIds,
      taxable: item.taxable,
    })),
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
      currency: STORE_CURRENCY,
      subtotal: totals.subtotal,
      discountTotal: totals.discount,
      shippingTotal: totals.shipping,
      taxTotal: totals.tax,
      total: totals.total,
      status: manual ? "ON_HOLD" : "PENDING",
      paymentStatus: manual ? "AUTHORIZED" : "PENDING",
      paymentGatewayId: gateway.id,
      paymentMethod: gateway.type,
      paymentMethodTitle: gateway.name,
      shippingMethod: totals.shippingLabel,
      billingFirstName: addresses.billing.firstName || null,
      billingLastName: addresses.billing.lastName || null,
      billingCompany: addresses.billing.company || null,
      billingAddress1: addresses.billing.address1 || null,
      billingAddress2: addresses.billing.address2 || null,
      billingCity: addresses.billing.city || null,
      billingState: addresses.billing.state || null,
      billingPostcode: addresses.billing.postcode || null,
      billingCountry: addresses.billing.country || null,
      billingPhone: addresses.billing.phone || null,
      billingEmail: email,
      shippingFirstName: addresses.shipping.firstName || null,
      shippingLastName: addresses.shipping.lastName || null,
      shippingCompany: addresses.shipping.company || null,
      shippingAddress1: addresses.shipping.address1 || null,
      shippingAddress2: addresses.shipping.address2 || null,
      shippingCity: addresses.shipping.city || null,
      shippingState: addresses.shipping.state || null,
      shippingPostcode: addresses.shipping.postcode || null,
      shippingCountry: addresses.shipping.country || null,
      shippingPhone: addresses.shipping.phone || null,
      customerNote: null,
      meta: {
        ...(totals.coupon ? { couponCode: totals.coupon.code } : {}),
        ...(manual ? { manualPayment: true } : {}),
        taxRate: totals.taxRate,
        ...(checkoutToken ? { checkoutToken } : {}),
        ...(cartSessionId ? { cartSessionId } : {}),
        ...(serviceBooking ? { serviceBooking } : {}),
        ...(subscriptionPlans.length > 0 ? { subscriptionPlans } : {}),
        ...addressMeta(addresses),
      },
      items: {
        create: items.map((item, i) => ({
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          sku: item.sku,
          type: item.type,
          quantity: item.quantity,
          price: item.unitPrice,
          lineSubtotal: lineTotals[i],
          lineSubtotalTax: lineTax[i],
          lineTotal: round2(lineTotals[i] - lineDiscount[i]),
          lineTax: lineTax[i],
          taxClass: item.taxClass,
          taxRate: item.taxable && totals.taxRate > 0 ? totals.taxRate : null,
          meta: {
            ...(item.variantId ? { variantId: item.variantId } : {}),
            ...(item.variantName ? { variantName: item.variantName } : {}),
            ...(Object.keys(item.options).length > 0 ? { options: item.options } : {}),
            ...(item.type === "SERVICE" && serviceBooking ? { serviceBooking } : {}),
            ...(item.isSignupFee ? { isSignupFee: true } : {}),
            ...(item.bundleChildren?.length ? { bundleChildren: item.bundleChildren } : {}),
            taxCountry: addresses.billing.country || null,
            taxState: addresses.billing.state || null,
          } as Prisma.InputJsonValue,
        })),
      },
    },
  });
}

/** Send the customer to the gateway's payment flow (order already created). */
async function startPayment(
  order: { id: string; orderNumber: string },
  totals: QuoteTotals,
  productSlugForCancel: string | null,
  gateway: { id: string; name: string; type: string; config: unknown },
  access: OrderAccess,
): Promise<PurchaseResult> {
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const accessToken = await createOrderAccessToken({
    orderId: order.id,
    tenantId: TENANT_ID,
    email: access.email,
    sessionId: access.cartSessionId,
    checkoutToken: access.checkoutToken,
  });
  const localSuccessUrl = successUrl(order.id, accessToken);
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
      const session = await stripe.checkout.sessions.create(
        buildStripeOrderSessionParams({
          orderId: order.id,
          orderNumber: order.orderNumber,
          total: totals.total,
          currency: STORE_CURRENCY,
          successUrl: `${siteUrl}${localSuccessUrl}`,
          cancelUrl,
        }),
      );
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
        returnUrl: `${siteUrl}/checkout/paypal/return?access=${encodeURIComponent(accessToken)}`,
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
        redirectUrl: `${siteUrl}/checkout/square/return?reference=${order.id}&access=${encodeURIComponent(accessToken)}`,
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
    return { ok: true, url: localSuccessUrl };
  }

  return { ok: true, url: localSuccessUrl };
}

/** Shared tail: reuse-or-create the order idempotently, reserve stock, start payment. */
async function placeOrder(
  lines: { ok: true; items: LineItem[] } | { ok: false; error: string },
  totalsResult: Promise<QuoteTotals>,
  gatewayResult: { ok: true; gateway: { id: string; name: string; type: string; config: unknown } } | { ok: false; error: string },
  email: string | null,
  addresses: CheckoutAddresses,
  productSlugForCancel: string | null,
  checkoutToken: string | null,
  cartSessionId: string | null,
  serviceBooking: ServiceBooking | null,
): Promise<PurchaseResult> {
  if (!lines.ok) return lines;
  if (!gatewayResult.ok) return gatewayResult;
  const access: OrderAccess = { email, cartSessionId, checkoutToken };

  const totals = await totalsResult;
  if (totals.couponError) return { ok: false, error: totals.couponError };

  // Shipping orders need a deliverable address; digital-only orders don't.
  const requiresShipping = lines.items.some((item) => item.shippingRequired);
  const addressError = validateCheckoutAddresses(addresses, requiresShipping);
  if (addressError) return { ok: false, error: addressError };

  // ── Idempotency: a re-submit (double click, back button, flaky network)
  //    with the same checkout token reuses the order it already created.
  if (checkoutToken) {
    const existing = await findOrderByToken(checkoutToken);
    if (existing) {
      if (existing.paymentStatus === "PAID" || existing.status === "COMPLETED") {
        return { ok: true, url: await orderSuccessUrl(existing.id, access) };
      }
      const active =
        (existing.status === "PENDING" && existing.paymentStatus === "PENDING") ||
        (gatewayResult.gateway.type === "MANUAL" &&
          existing.status === "ON_HOLD" &&
          existing.paymentStatus === "AUTHORIZED");
      if (active && orderMatchesAttempt(existing, lines.items, totals, gatewayResult.gateway.id, addresses)) {
        return startPayment(existing, totals, productSlugForCancel, gatewayResult.gateway, access);
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

  const stock = await reserveStock(stockItemsForLineItems(lines.items));
  if (!stock.ok) return stock;

  let order;
  try {
    order = await createOrder(
      lines.items,
      totals,
      gatewayResult.gateway,
      email,
      addresses,
      checkoutToken,
      cartSessionId,
      serviceBooking,
    );
    logOrderCreated({
      orderId: order.id,
      gatewayType: gatewayResult.gateway.type,
      itemCount: lines.items.length,
      total: totals.total,
    });
  } catch (e) {
    // Order creation failed — give the reserved stock back.
    await restoreStockForOrderFallback(lines.items);
    // Lost a race with a concurrent submit of the same token: the winner
    // created the order, so reuse it instead of erroring.
    const code = (e as { code?: string }).code;
    if (checkoutToken && code === "P2002") {
      const winner = await findOrderByToken(checkoutToken).catch(() => null);
      if (winner && winner.status === "PENDING") {
        return startPayment(winner, totals, productSlugForCancel, gatewayResult.gateway, access);
      }
      return winner
        ? { ok: true, url: await orderSuccessUrl(winner.id, access) }
        : { ok: false, error: "Could not create your order." };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Could not create your order." };
  }

  // Send order confirmation email when order is first created (PENDING status).
  // This complements the abandoned-order sweep by confirming before cancelation.
  if (order) {
    const emailLineTotals = lines.items.map((item) => round2(item.unitPrice * item.quantity));
    const { lineDiscount, lineTax } = allocateToLines(
      lines.items.map((item, i) => ({
        lineTotal: emailLineTotals[i],
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        saleItem: item.saleItem,
        couponEligible: item.couponEligible !== false,
        categoryIds: item.categoryIds,
        taxable: item.taxable,
      })),
      totals,
    );
    const emailData = toOrderEmailData({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethodTitle: order.paymentMethodTitle,
      billingEmail: order.billingEmail,
      guestEmail: order.guestEmail,
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      shippingTotal: order.shippingTotal,
      taxTotal: order.taxTotal,
      total: order.total,
      currency: order.currency,
      items: lines.items.map((item, i) => ({
        name: item.name,
        quantity: item.quantity,
        lineTotal: round2(emailLineTotals[i] - lineDiscount[i] + lineTax[i]),
      })),
    });
    await sendOrderConfirmationEmail(emailData).catch(() => {});
  }

  // Consume one coupon usage now that the order exists (limits are checked
  // at quote time, so this makes usedCount authoritative). Released again if
  // the order is later deleted/cancelled before payment (releaseOrderCoupon).
  if (totals.coupon) await adjustCouponUsage(totals.coupon.code, 1);

  return startPayment(order, totals, productSlugForCancel, gatewayResult.gateway, access);
}

function stockItemsForLineItems(items: LineItem[]) {
  return items
    .filter((item) => !item.isSignupFee)
    .flatMap((item) => [
      { productId: item.productId, variantId: item.variantId, quantity: item.quantity },
      ...(item.bundleChildren ?? []).map((child) => ({
        productId: child.productId,
        variantId: child.variantId ?? null,
        quantity: child.quantity * item.quantity,
      })),
    ]);
}

async function findServiceBookingConflictForProduct(
  productId: string,
  booking: ServiceBooking,
  constraints: {
    durationMinutes?: number | null;
    bufferBeforeMinutes?: number | null;
    bufferAfterMinutes?: number | null;
    maxBookings?: number | null;
  },
): Promise<string | null> {
  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Invalid booking time.";
  const windowStart = new Date(start.getTime() - 24 * 60 * 60_000);
  const windowEnd = new Date(end.getTime() + 24 * 60 * 60_000);

  const orders = await prisma.order.findMany({
    where: {
      tenantId: TENANT_ID,
      status: { in: ["PENDING", "PROCESSING", "ON_HOLD", "COMPLETED"] },
      items: { some: { productId, type: "SERVICE" } },
      createdAt: { gte: windowStart, lte: windowEnd },
    },
    select: {
      id: true,
      meta: true,
      items: {
        where: { productId, type: "SERVICE" },
        select: { meta: true, quantity: true },
      },
    },
  });

  const existing = orders.flatMap((order) => {
    const orderMeta = (order.meta ?? {}) as Record<string, unknown>;
    const topBooking = orderMeta.serviceBooking as Record<string, unknown> | undefined;
    const rows: Array<{ startAt: string; endAt?: string; durationMinutes?: number | null; bufferBeforeMinutes?: number | null; bufferAfterMinutes?: number | null; quantity: number }> = [];
    if (topBooking?.startAt) {
      rows.push({
        startAt: String(topBooking.startAt),
        endAt: typeof topBooking.endAt === "string" ? topBooking.endAt : undefined,
        quantity: 1,
      });
    }
    for (const item of order.items) {
      const itemMeta = (item.meta ?? {}) as Record<string, unknown>;
      const itemBooking = itemMeta.serviceBooking as Record<string, unknown> | undefined;
      if (!itemBooking?.startAt) continue;
      rows.push({
        startAt: String(itemBooking.startAt),
        endAt: typeof itemBooking.endAt === "string" ? itemBooking.endAt : undefined,
        quantity: Math.max(1, item.quantity),
      });
    }
    return rows;
  });

  const conflict = findServiceBookingConflict(
    booking,
    existing,
    {
      durationMinutes: constraints.durationMinutes ?? 60,
      bufferBeforeMinutes: constraints.bufferBeforeMinutes ?? 0,
      bufferAfterMinutes: constraints.bufferAfterMinutes ?? 0,
    },
  );
  if (conflict) return "That service time is no longer available. Please choose another slot.";

  const maxBookings = Math.max(0, Math.floor(constraints.maxBookings ?? 0));
  if (maxBookings > 0) {
    const overlappingCount = existing.reduce((count, row) => {
      const rowStart = new Date(row.startAt);
      const rowEnd = row.endAt ? new Date(row.endAt) : new Date(rowStart.getTime() + (constraints.durationMinutes ?? 60) * 60_000);
      if (Number.isNaN(rowStart.getTime()) || Number.isNaN(rowEnd.getTime())) return count;
      const overlaps = start < rowEnd && rowStart < end;
      return overlaps ? count + row.quantity : count;
    }, 0);
    if (overlappingCount >= maxBookings) {
      return "That service slot is fully booked. Please choose another time.";
    }
  }
  return null;
}

/** Restore stock directly from line items (used when no order row exists yet). */
async function restoreStockForOrderFallback(items: LineItem[]): Promise<void> {
  for (const item of stockItemsForLineItems(items)) {
    if (item.variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: item.variantId, productId: item.productId },
        select: { id: true, manageStock: true },
      });
      if (variant?.manageStock) {
        await prisma.productVariant
          .update({
            where: { id: variant.id },
            data: { stockQuantity: { increment: item.quantity } },
          })
          .catch(() => {});
        continue;
      }
    }
    await prisma.product
      .updateMany({
        where: { id: item.productId, tenantId: TENANT_ID, manageStock: true },
        data: { stockQuantity: { increment: item.quantity } },
      })
      .catch(() => {});
  }
}

/** Buy now from the single product page. */
export async function purchaseProduct(formData: FormData): Promise<PurchaseResult> {
  const throttled = await throttle("placeOrder", 10, 60_000);
  if (throttled) return { ok: false, error: throttled };

  const productId = String(formData.get("productId") ?? "").trim();
  const variantId = String(formData.get("variantId") ?? "").trim() || null;
  const options = normalizeCartOptions(parseJsonInput(formData.get("options")));
  const gatewayId = String(formData.get("gatewayId") ?? "").trim();
  const quantity = Math.min(999, Math.max(1, parseInt(String(formData.get("quantity") ?? "1"), 10) || 1));
  const email = String(formData.get("email") ?? "").trim() || null;
  const couponCode = String(formData.get("couponCode") ?? "").trim() || null;
  const checkoutToken = normalizeCheckoutToken(formData.get("checkoutToken"));

  if (!productId) return { ok: false, error: "Missing product." };
  if (!gatewayId) return { ok: false, error: "Please choose a payment method." };

  const gatewayResult = await resolveGateway(gatewayId);
  if (!gatewayResult.ok) return gatewayResult;

  const lines = await buildLineItems([{ productId, quantity, variantId, options }], { email });
  if (!lines.ok) return lines;

  const serviceItem = lines.items.find((item) => item.type === "SERVICE");
  const booking = parseServiceBooking(
    formData.get("serviceDate"),
    formData.get("serviceTime"),
    Boolean(serviceItem),
    serviceItem
      ? {
          durationMinutes: serviceItem.serviceDurationMinutes,
          bufferBeforeMinutes: serviceItem.serviceBufferBeforeMinutes,
          bufferAfterMinutes: serviceItem.serviceBufferAfterMinutes,
        }
      : {},
  );
  if (!booking.ok) return booking;
  if (booking.booking && serviceItem) {
    const conflict = await findServiceBookingConflictForProduct(
      serviceItem.productId,
      booking.booking,
      {
        durationMinutes: serviceItem.serviceDurationMinutes,
        bufferBeforeMinutes: serviceItem.serviceBufferBeforeMinutes,
        bufferAfterMinutes: serviceItem.serviceBufferAfterMinutes,
        maxBookings: serviceItem.serviceMaxBookings,
      },
    );
    if (conflict) return { ok: false, error: conflict };
  }

  const addresses = readCheckoutAddresses(formData);
  const tax = taxAddress(addresses);
  const totals = quoteTotals({
    lines: toQuoteLines(lines.items),
    couponCode,
    customer: { userId: await getSessionUid().catch(() => null), email },
    country: tax.country,
    state: tax.state,
  });

  return placeOrder(lines, totals, gatewayResult, email, addresses, null, checkoutToken, null, booking.booking);
}

/** Place an order for everything in the cart. */
export async function checkoutCart(formData: FormData): Promise<PurchaseResult> {
  const throttled = await throttle("placeOrder", 10, 60_000);
  if (throttled) return { ok: false, error: throttled };

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
    cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      variantId: item.variantId,
      options:
        item.meta && typeof item.meta === "object" && !Array.isArray(item.meta)
          ? (item.meta as Record<string, unknown>).customOptions
          : null,
    })),
    { email },
  );
  if (!lines.ok) return lines;

  const serviceItem = lines.items.find((item) => item.type === "SERVICE");
  const booking = parseServiceBooking(
    formData.get("serviceDate"),
    formData.get("serviceTime"),
    Boolean(serviceItem),
    serviceItem
      ? {
          durationMinutes: serviceItem.serviceDurationMinutes,
          bufferBeforeMinutes: serviceItem.serviceBufferBeforeMinutes,
          bufferAfterMinutes: serviceItem.serviceBufferAfterMinutes,
        }
      : {},
  );
  if (!booking.ok) return booking;
  if (booking.booking && serviceItem) {
    const conflict = await findServiceBookingConflictForProduct(
      serviceItem.productId,
      booking.booking,
      {
        durationMinutes: serviceItem.serviceDurationMinutes,
        bufferBeforeMinutes: serviceItem.serviceBufferBeforeMinutes,
        bufferAfterMinutes: serviceItem.serviceBufferAfterMinutes,
        maxBookings: serviceItem.serviceMaxBookings,
      },
    );
    if (conflict) return { ok: false, error: conflict };
  }

  const addresses = readCheckoutAddresses(formData);
  const tax = taxAddress(addresses);
  const totals = quoteTotals({
    lines: toQuoteLines(lines.items),
    couponCode: cart.couponCode,
    customer: { userId: cart.userId ?? (await getSessionUid().catch(() => null)), email },
    country: tax.country,
    state: tax.state,
  });

  return placeOrder(
    lines,
    totals,
    gatewayResult,
    email,
    addresses,
    null,
    checkoutToken,
    sessionId,
    booking.booking,
  );
}

/** Apply a coupon code to the current cart (validated immediately). */
export async function applyCouponToCart(formData: FormData): Promise<CouponActionResult> {
  const throttled = await throttle("coupon", 15, 60_000);
  if (throttled) return { ok: false, error: throttled };

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { ok: false, error: "Enter a coupon code." };

  const sessionId = await readExistingCartSession();
  const cart = sessionId ? await getCartBySession(sessionId) : null;
  if (!cart || cart.items.length === 0) return { ok: false, error: "Your cart is empty." };

  const linesResult = await buildLineItems(
    cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      variantId: item.variantId,
      options:
        item.meta && typeof item.meta === "object" && !Array.isArray(item.meta)
          ? (item.meta as Record<string, unknown>).customOptions
          : null,
    })),
    { email: String(formData.get("email") ?? "").trim() || null },
  );
  if (!linesResult.ok) return { ok: false, error: linesResult.error };

  const lines = toQuoteLines(linesResult.items);
  const subtotal = round2(linesResult.total);

  const result = await resolveCoupon(code, lines, subtotal, {
    userId: cart.userId ?? (await getSessionUid().catch(() => null)),
    email: String(formData.get("email") ?? "").trim() || null,
  });
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

  const linesResult = await buildLineItems(
    cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      variantId: item.variantId,
      options:
        item.meta && typeof item.meta === "object" && !Array.isArray(item.meta)
          ? (item.meta as Record<string, unknown>).customOptions
          : null,
    })),
    { email: String(formData.get("email") ?? "").trim() || null },
  );
  if (!linesResult.ok) return { ok: false, error: linesResult.error };

  const totals = await quoteTotals({
    lines: toQuoteLines(linesResult.items),
    couponCode: cart.couponCode,
    customer: {
      userId: cart.userId ?? (await getSessionUid().catch(() => null)),
      email: String(formData.get("email") ?? "").trim() || null,
    },
    country:
      String(formData.get("billingCountry") ?? formData.get("country") ?? "").trim().toUpperCase() || null,
    state:
      String(formData.get("billingState") ?? formData.get("state") ?? "").trim() || null,
  });
  return { ok: true, totals };
}
