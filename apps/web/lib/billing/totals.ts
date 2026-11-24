/**
 * Checkout totals engine — coupons, tax rates, shipping.
 *
 * Shared by the checkout preview (server components), the live quote
 * server action, and order creation so every surface agrees on numbers.
 */
import type { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { safeDb } from "@/lib/db-resilient";
import { formatMoney, STORE_CURRENCY } from "@/modules/ecommerce/currency";

export type AppliedCouponType = "PERCENT" | "FIXED_CART" | "FIXED_PRODUCT" | "FREE_SHIPPING";

export type QuoteLine = {
  productId: string;
  quantity: number;
  unitPrice: number;
  variantId?: string | null;
  name?: string;
  sku?: string | null;
  saleItem?: boolean;
  taxable?: boolean;
  taxStatus?: string | null;
  taxClass?: string | null;
  shippingRequired?: boolean;
  shippingClassId?: string | null;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  couponEligible?: boolean;
  categoryIds?: string[];
  bundleChildren?: Array<{
    productId: string;
    quantity: number;
    variantId?: string | null;
    name?: string | null;
    sku?: string | null;
  }>;
};

export type AppliedCoupon = {
  code: string;
  type: AppliedCouponType;
  amount: number;
  freeShipping: boolean;
  discount: number;
  productIds?: string[];
  excludedProductIds?: string[];
  categoryIds?: string[];
  excludedCategoryIds?: string[];
  excludeSaleItems?: boolean;
  individualUse?: boolean;
  usageLimitPerUser?: number;
};

export type ShippingSettings = {
  enabled: boolean;
  flatRate: number;
  freeOver: number | null;
};

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  enabled: true,
  flatRate: 0,
  freeOver: null,
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Read shipping settings from the tenant theme JSON. */
export function readShippingSettings(theme: unknown): ShippingSettings {
  const general = (theme as { generalSettings?: Record<string, unknown> } | null)?.generalSettings;
  const rawFlat = general?.shippingFlatRate;
  const rawFree = general?.shippingFreeOver;
  return {
    enabled: general?.shippingEnabled === undefined ? DEFAULT_SHIPPING_SETTINGS.enabled : general.shippingEnabled === true,
    flatRate: typeof rawFlat === "number" && Number.isFinite(rawFlat) ? rawFlat : 0,
    freeOver: typeof rawFree === "number" && Number.isFinite(rawFree) ? rawFree : null,
  };
}

/** Whether listed product prices already contain tax (tax-inclusive pricing). */
export function pricesIncludeTax(theme: unknown): boolean {
  const general = (theme as { generalSettings?: Record<string, unknown> } | null)?.generalSettings;
  return general?.pricesIncludeTax === true;
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const tenant = await safeDb(() => prisma.tenant.findUnique({ where: { id: TENANT_ID } }), null);
  return readShippingSettings(tenant?.theme);
}

/** Whether listed prices include tax (tax-inclusive pricing) for this store. */
export async function getPricesIncludeTax(): Promise<boolean> {
  const tenant = await safeDb(() => prisma.tenant.findUnique({ where: { id: TENANT_ID } }), null);
  return pricesIncludeTax(tenant?.theme);
}

type CouponLookup = { ok: true; coupon: AppliedCoupon } | { ok: false; error: string };

export type CouponResolutionOptions = {
  otherCouponCodes?: string[];
};

/** Validate a coupon against the current cart/order and compute its discount. */
export async function resolveCoupon(
  code: string,
  lines: QuoteLine[],
  subtotal: number,
  customer?: { userId?: string | null; email?: string | null },
  options: CouponResolutionOptions = {},
): Promise<CouponLookup> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: "Enter a coupon code." };

  const row = await prisma.coupon.findFirst({
    where: { code: { equals: trimmed, mode: "insensitive" }, tenantId: TENANT_ID },
  });
  if (!row || !row.isActive) return { ok: false, error: "That coupon code is not valid." };

  const now = new Date();
  if (row.startDate && row.startDate > now) {
    return { ok: false, error: "That coupon is not active yet." };
  }
  if (row.endDate && row.endDate < now) {
    return { ok: false, error: "That coupon has expired." };
  }
  if (row.usageLimit !== null && row.usedCount >= row.usageLimit) {
    return { ok: false, error: "That coupon has reached its usage limit." };
  }
  if (row.usageLimitPerUser > 0) {
    const identity: Prisma.OrderWhereInput[] = [];
    if (customer?.userId) {
      identity.push({ userId: customer.userId }, { customerId: customer.userId });
    }
    if (customer?.email) {
      identity.push(
        { guestEmail: { equals: customer.email, mode: "insensitive" } },
        { billingEmail: { equals: customer.email, mode: "insensitive" } },
      );
    }
    if (identity.length > 0) {
      const usedByCustomer = await prisma.order.count({
        where: {
          tenantId: TENANT_ID,
          status: { notIn: ["CANCELLED", "REFUNDED", "FAILED"] },
          meta: { path: ["couponCode"], equals: row.code },
          OR: identity,
        },
      });
      if (usedByCustomer >= row.usageLimitPerUser) {
        return { ok: false, error: "You have already used this coupon." };
      }
    }
  }
  const otherCodes = [...new Set((options.otherCouponCodes ?? [])
    .map((value) => value.trim().toUpperCase())
    .filter((value) => value && value !== row.code.toUpperCase()))];
  if (otherCodes.length > 0) {
    const others = await prisma.coupon.findMany({
      where: { tenantId: TENANT_ID, code: { in: otherCodes } },
      select: { code: true, individualUse: true, isActive: true },
    });
    if (row.individualUse || others.some((other) => other.isActive && other.individualUse)) {
      return { ok: false, error: "That coupon cannot be combined with another coupon." };
    }
  }
  if (row.maxAmount !== null && subtotal > row.maxAmount) {
    return {
      ok: false,
      error: `That coupon cannot be used on orders over ${formatMoney(row.maxAmount, STORE_CURRENCY)}.`,
    };
  }
  if (row.minAmount !== null && subtotal < row.minAmount) {
    return {
      ok: false,
      error: `That coupon requires a minimum spend of ${formatMoney(row.minAmount, STORE_CURRENCY)}.`,
    };
  }

  let discount = 0;
  const freeShipping = row.type === "FREE_SHIPPING" || row.freeShipping;
  const targeting = {
    productIds: row.productIds,
    excludedProductIds: row.excludedProductIds,
    categoryIds: row.categoryIds,
    excludedCategoryIds: row.excludedCategoryIds,
    excludeSaleItems: row.excludeSaleItems,
  };
  const eligibleLines = lines.filter((line) => isCouponEligibleLine(line, targeting));
  const eligibleSubtotal = round2(
    eligibleLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
  );
  if (eligibleSubtotal <= 0 && row.type !== "FREE_SHIPPING") {
    return { ok: false, error: "That coupon does not apply to any items in your cart." };
  }

  switch (row.type) {
    case "PERCENT":
      discount = eligibleSubtotal * (row.amount / 100);
      break;
    case "FIXED_CART":
      discount = Math.min(row.amount, eligibleSubtotal);
      break;
    case "FIXED_PRODUCT":
      discount = eligibleLines.reduce((sum, line) => sum + row.amount * line.quantity, 0);
      break;
    case "FREE_SHIPPING":
      discount = 0;
      break;
  }

  discount = round2(Math.max(0, Math.min(discount, eligibleSubtotal)));

  return {
    ok: true,
    coupon: {
      code: row.code,
      type: row.type,
      amount: row.amount,
      freeShipping,
      discount,
      productIds: row.productIds,
      excludedProductIds: row.excludedProductIds,
      categoryIds: row.categoryIds,
      excludedCategoryIds: row.excludedCategoryIds,
      excludeSaleItems: row.excludeSaleItems,
      individualUse: row.individualUse,
      usageLimitPerUser: row.usageLimitPerUser,
    },
  };
}

/** Resolve the applicable tax rate for a country/state (state wins over country-wide). */
export async function resolveTaxRate(
  country?: string | null,
  state?: string | null,
): Promise<number> {
  if (!country) return 0;
  try {
    const rows = await prisma.taxRate.findMany({
      where: {
        tenantId: TENANT_ID,
        country: { equals: country, mode: "insensitive" },
      },
      orderBy: { priority: "desc" },
    });
    const stateMatch = state
      ? rows.find((r) => r.state !== null && r.state.toLowerCase() === state.toLowerCase())
      : null;
    const countryMatch = rows.find((r) => r.state === null);
    return (stateMatch ?? countryMatch)?.rate ?? 0;
  } catch (e) {
    console.error("[totals] tax rate lookup failed — defaulting to 0:", e);
    return 0;
  }
}

export type QuoteTotals = {
  subtotal: number;
  taxableSubtotal: number;
  discount: number;
  shipping: number;
  shippingLabel: string;
  tax: number;
  taxRate: number;
  total: number;
  currency: string;
  coupon: AppliedCoupon | null;
  couponError: string | null;
  /** True when listed prices included tax (tax shown is informational only). */
  pricesIncludeTax: boolean;
};

export type QuoteInput = {
  lines: QuoteLine[];
  couponCode?: string | null;
  country?: string | null;
  state?: string | null;
  shippingSettings?: ShippingSettings;
  customer?: { userId?: string | null; email?: string | null };
  otherCouponCodes?: string[];
  /** Override for tax-inclusive pricing (defaults to the store setting). */
  pricesIncludeTax?: boolean;
};

type CouponTargeting = Pick<
  AppliedCoupon,
  "productIds" | "excludedProductIds" | "categoryIds" | "excludedCategoryIds" | "excludeSaleItems"
>;

type CouponEligibleLine = Pick<
  QuoteLine,
  "productId" | "categoryIds" | "saleItem" | "couponEligible"
>;

function isCouponEligibleLine(line: CouponEligibleLine, coupon?: CouponTargeting): boolean {
  if (line.couponEligible === false) return false;
  if (!coupon) return true;
  if (coupon.excludeSaleItems === true && line.saleItem === true) return false;
  if (coupon.excludedProductIds?.includes(line.productId)) return false;
  const lineCategories = line.categoryIds ?? [];
  if (lineCategories.some((id) => coupon.excludedCategoryIds?.includes(id))) return false;
  const productTargeted = (coupon.productIds?.length ?? 0) > 0;
  const categoryTargeted = (coupon.categoryIds?.length ?? 0) > 0;
  if (!productTargeted && !categoryTargeted) return true;
  const productMatch = productTargeted && Boolean(coupon.productIds?.includes(line.productId));
  const categoryMatch = categoryTargeted && lineCategories.some((id) => coupon.categoryIds?.includes(id));
  return productMatch || categoryMatch;
}

export function isLineTaxable(line: Pick<QuoteLine, "taxable" | "taxStatus">): boolean {
  const taxStatus = line.taxStatus?.toUpperCase();
  return line.taxable !== false && taxStatus !== "NONE" && taxStatus !== "NO_TAX";
}

type DiscountableLine = Pick<
  QuoteLine,
  "productId" | "quantity" | "unitPrice" | "saleItem" | "couponEligible" | "categoryIds"
> & {
  lineTotal?: number;
};

function lineAmount(line: DiscountableLine): number {
  return line.lineTotal ?? round2(line.unitPrice * line.quantity);
}

export function computeLineDiscounts(
  lines: DiscountableLine[],
  coupon: AppliedCoupon | null,
): number[] {
  if (!coupon || coupon.discount <= 0) return lines.map(() => 0);

  if (coupon.type === "FIXED_PRODUCT") {
    const raw = lines.map((line) => {
      if (!isCouponEligibleLine(line, coupon)) return 0;
      const included =
        !coupon.productIds || coupon.productIds.length === 0 || coupon.productIds.includes(line.productId);
      const excluded = coupon.excludedProductIds?.includes(line.productId) ?? false;
      const saleBlocked = coupon.excludeSaleItems === true && line.saleItem === true;
      if (!included || excluded || saleBlocked) return 0;
      const lineTotal = lineAmount(line);
      return round2(Math.min(coupon.amount * line.quantity, lineTotal));
    });
    const rawSum = round2(raw.reduce((sum, value) => sum + value, 0));
    if (rawSum <= 0) return lines.map(() => 0);
    if (Math.abs(rawSum - coupon.discount) < 0.001) return raw;
    const scaled = raw.map((value) => round2((value / rawSum) * coupon.discount));
    let used = 0;
    let last = -1;
    for (let i = 0; i < scaled.length; i++) {
      if (raw[i] > 0) last = i;
    }
    return scaled.map((value, i) => {
      const capped = Math.min(value, lineAmount(lines[i]));
      if (i === last) return round2(Math.max(0, Math.min(lineAmount(lines[i]), coupon.discount - used)));
      used += capped;
      return capped;
    });
  }

  const eligibleIndexes = lines
    .map((line, i) => (isCouponEligibleLine(line, coupon) ? i : -1))
    .filter((i) => i >= 0);
  const eligibleSubtotal = round2(
    eligibleIndexes.reduce((sum, i) => sum + lineAmount(lines[i]), 0),
  );
  if (eligibleSubtotal <= 0 || eligibleIndexes.length === 0) return lines.map(() => 0);

  const out = lines.map(() => 0);
  let used = 0;
  for (let idx = 0; idx < eligibleIndexes.length; idx++) {
    const i = eligibleIndexes[idx];
    const share = lineAmount(lines[i]) / eligibleSubtotal;
    let d =
      idx === eligibleIndexes.length - 1
        ? round2(coupon.discount - used)
        : round2(coupon.discount * share);
    d = Math.max(0, Math.min(d, lineAmount(lines[i])));
    out[i] = d;
    used += d;
  }
  return out;
}

/** Compute the full totals breakdown for a set of lines. */
export async function quoteTotals(input: QuoteInput): Promise<QuoteTotals> {
  const lineTotals = input.lines.map((line) => round2(line.unitPrice * line.quantity));
  const subtotal = round2(lineTotals.reduce((sum, value) => sum + value, 0));
  const taxableSubtotal = round2(
    input.lines.reduce((sum, line, i) => sum + (isLineTaxable(line) ? lineTotals[i] : 0), 0),
  );

  let coupon: AppliedCoupon | null = null;
  let couponError: string | null = null;
  if (input.couponCode) {
    const result = await resolveCoupon(input.couponCode, input.lines, subtotal, input.customer, {
      otherCouponCodes: input.otherCouponCodes,
    });
    if (result.ok) coupon = result.coupon;
    else couponError = result.error;
  }

  const lineDiscounts = computeLineDiscounts(input.lines, coupon);
  const discount = round2(lineDiscounts.reduce((sum, value) => sum + value, 0));
  const settings = input.shippingSettings ?? (await getShippingSettings());

  const needsShipping = input.lines.some((line) => line.shippingRequired !== false);
  let shipping = 0;
  let shippingLabel = "Free";
  if (needsShipping && subtotal > 0) {
    const free =
      coupon?.freeShipping === true ||
      (settings.freeOver !== null && subtotal >= settings.freeOver);
    shipping = settings.enabled && !free ? round2(settings.flatRate) : 0;
    shippingLabel = shipping > 0 ? "Standard" : "Free";
  }

  const taxRate = await resolveTaxRate(input.country, input.state);
  const taxableAmount = round2(
    input.lines.reduce((sum, line, i) => {
      if (!isLineTaxable(line)) return sum;
      return sum + Math.max(0, round2(lineTotals[i] - lineDiscounts[i]));
    }, 0),
  );
  const inclusive = input.pricesIncludeTax ?? (await getPricesIncludeTax());
  const tax = inclusive
    ? round2((taxableAmount * taxRate) / (100 + taxRate))
    : round2((taxableAmount * taxRate) / 100);
  const total = round2(subtotal - discount + shipping + (inclusive ? 0 : tax));

  return {
    subtotal,
    taxableSubtotal,
    discount,
    shipping,
    shippingLabel,
    tax,
    taxRate,
    total,
    currency: STORE_CURRENCY,
    coupon: coupon ? { ...coupon, discount } : null,
    couponError,
    pricesIncludeTax: inclusive,
  };
}

/** Allocate the order-level discount + tax across lines (keeps item rows consistent with totals). */
export function allocateToLines(
  lines: Array<{
    lineTotal: number;
    taxable?: boolean;
    taxStatus?: string | null;
    couponEligible?: boolean;
    productId?: string;
    quantity?: number;
    unitPrice?: number;
    saleItem?: boolean;
  }>,
  totals: { discount: number; tax: number; coupon?: AppliedCoupon | null },
): { lineDiscount: number[]; lineTax: number[] } {
  const allocLines = lines.map((line, i) => ({
    productId: line.productId ?? `line_${i}`,
    quantity: line.quantity ?? 1,
    unitPrice: line.unitPrice ?? line.lineTotal,
    saleItem: line.saleItem,
    couponEligible: line.couponEligible,
    lineTotal: line.lineTotal,
  }));
  let lineDiscount = totals.coupon ? computeLineDiscounts(allocLines, totals.coupon) : null;
  if (!lineDiscount) {
    const eligibleIndexes = lines
      .map((line, i) => (line.couponEligible !== false ? i : -1))
      .filter((i) => i >= 0);
    const eligibleSubtotal = round2(eligibleIndexes.reduce((sum, i) => sum + lines[i].lineTotal, 0));
    lineDiscount = lines.map(() => 0);
    if (totals.discount > 0 && eligibleSubtotal > 0) {
      let used = 0;
      for (let idx = 0; idx < eligibleIndexes.length; idx++) {
        const i = eligibleIndexes[idx];
        const share = lines[i].lineTotal / eligibleSubtotal;
        let d = idx === eligibleIndexes.length - 1 ? round2(totals.discount - used) : round2(totals.discount * share);
        d = Math.max(0, Math.min(d, lines[i].lineTotal));
        lineDiscount[i] = d;
        used += d;
      }
    }
  }
  const diff = round2(totals.discount - round2(lineDiscount.reduce((sum, value) => sum + value, 0)));
  if (Math.abs(diff) >= 0.01) {
    for (let i = lineDiscount.length - 1; i >= 0; i--) {
      if (lines[i].couponEligible === false) continue;
      const next = round2(Math.max(0, Math.min(lines[i].lineTotal, lineDiscount[i] + diff)));
      if (next !== lineDiscount[i]) {
        lineDiscount[i] = next;
        break;
      }
    }
  }

  const taxableNet = lines.map((line, i) =>
    isLineTaxable(line) ? Math.max(0, round2(line.lineTotal - lineDiscount[i])) : 0,
  );
  const taxableTotal = round2(taxableNet.reduce((sum, value) => sum + value, 0));
  const lineTax = lines.map(() => 0);
  if (totals.tax > 0 && taxableTotal > 0) {
    let usedTax = 0;
    let lastTaxable = -1;
    for (let i = 0; i < taxableNet.length; i++) if (taxableNet[i] > 0) lastTaxable = i;
    for (let i = 0; i < lines.length; i++) {
      if (taxableNet[i] <= 0) continue;
      let t =
        i === lastTaxable
          ? round2(totals.tax - usedTax)
          : round2((totals.tax * taxableNet[i]) / taxableTotal);
      t = Math.max(0, Math.min(t, taxableNet[i]));
      lineTax[i] = t;
      usedTax += t;
    }
  }

  return { lineDiscount, lineTax };
}
