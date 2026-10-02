/**
 * Checkout totals engine — coupons, tax rates, shipping.
 *
 * Shared by the checkout preview (server components), the live quote
 * server action, and order creation so every surface agrees on numbers.
 */
import { prisma, TENANT_ID } from "@/modules/shared";
import { safeDb } from "@/lib/db-resilient";

export type AppliedCouponType = "PERCENT" | "FIXED_CART" | "FIXED_PRODUCT" | "FREE_SHIPPING";

export type QuoteLine = {
  productId: string;
  quantity: number;
  unitPrice: number;
  saleItem?: boolean;
  shippingRequired?: boolean;
};

export type AppliedCoupon = {
  code: string;
  type: AppliedCouponType;
  amount: number;
  freeShipping: boolean;
  discount: number;
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

/** Validate a coupon against the current cart/order and compute its discount. */
export async function resolveCoupon(
  code: string,
  lines: QuoteLine[],
  subtotal: number,
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
  if (row.minAmount !== null && subtotal < row.minAmount) {
    return {
      ok: false,
      error: `That coupon requires a minimum spend of $${row.minAmount.toFixed(2)}.`,
    };
  }

  let discount = 0;
  const freeShipping = row.type === "FREE_SHIPPING" || row.freeShipping;

  switch (row.type) {
    case "PERCENT":
      discount = subtotal * (row.amount / 100);
      break;
    case "FIXED_CART":
      discount = row.amount;
      break;
    case "FIXED_PRODUCT": {
      for (const line of lines) {
        const included =
          row.productIds.length === 0 || row.productIds.includes(line.productId);
        const excluded = row.excludedProductIds.includes(line.productId);
        const saleBlocked = row.excludeSaleItems && line.saleItem === true;
        if (included && !excluded && !saleBlocked) {
          discount += row.amount * line.quantity;
        }
      }
      break;
    }
    case "FREE_SHIPPING":
      discount = 0;
      break;
  }

  if (row.maxAmount !== null) discount = Math.min(discount, row.maxAmount);
  discount = round2(Math.max(0, Math.min(discount, subtotal)));

  return {
    ok: true,
    coupon: {
      code: row.code,
      type: row.type,
      amount: row.amount,
      freeShipping,
      discount,
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
  discount: number;
  shipping: number;
  shippingLabel: string;
  tax: number;
  taxRate: number;
  total: number;
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
  /** Override for tax-inclusive pricing (defaults to the store setting). */
  pricesIncludeTax?: boolean;
};

/** Compute the full totals breakdown for a set of lines. */
export async function quoteTotals(input: QuoteInput): Promise<QuoteTotals> {
  const subtotal = round2(
    input.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
  );

  let coupon: AppliedCoupon | null = null;
  let couponError: string | null = null;
  if (input.couponCode) {
    const result = await resolveCoupon(input.couponCode, input.lines, subtotal);
    if (result.ok) coupon = result.coupon;
    else couponError = result.error;
  }

  const discount = coupon?.discount ?? 0;
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
  const taxable = Math.max(0, round2(subtotal - discount));
  const inclusive = input.pricesIncludeTax ?? (await getPricesIncludeTax());
  const tax = inclusive
    ? // Listed prices already contain tax — back the tax out of the taxable amount.
      round2((taxable * taxRate) / (100 + taxRate))
    : round2((taxable * taxRate) / 100);
  const total = round2(taxable + shipping + (inclusive ? 0 : tax));

  return {
    subtotal,
    discount: round2(discount),
    shipping,
    shippingLabel,
    tax,
    taxRate,
    total,
    coupon,
    couponError,
    pricesIncludeTax: inclusive,
  };
}

/** Allocate the order-level discount + tax across lines (keeps item rows consistent with totals). */
export function allocateToLines(
  lines: { lineTotal: number }[],
  totals: { subtotal: number; discount: number; tax: number },
): { lineDiscount: number[]; lineTax: number[] } {
  const subtotal = totals.subtotal > 0 ? totals.subtotal : 1;
  const lineDiscount: number[] = [];
  const lineTax: number[] = [];
  let usedDiscount = 0;
  let usedTax = 0;
  lines.forEach((line, i) => {
    const share = line.lineTotal / subtotal;
    let d = i === lines.length - 1 ? round2(totals.discount - usedDiscount) : round2(totals.discount * share);
    d = Math.min(d, line.lineTotal);
    const t = i === lines.length - 1 ? round2(totals.tax - usedTax) : round2(totals.tax * share);
    lineDiscount.push(d);
    lineTax.push(t);
    usedDiscount += d;
    usedTax += t;
  });
  return { lineDiscount, lineTax };
}
