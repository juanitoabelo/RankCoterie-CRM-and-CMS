import type { QuoteLine } from "@/lib/billing/totals";
import type { EffectiveProductPrice } from "./pricing";
import { getEffectiveProductPrice } from "./pricing";
import { getEffectiveVariantPrice } from "./product-form";

const NON_PURCHASABLE_TYPES = new Set(["EXTERNAL", "GROUPED"]);

export function isPurchasableProductType(type?: string | null): boolean {
  return !type || !NON_PURCHASABLE_TYPES.has(type);
}

export interface CartPricingProduct {
  id?: string;
  price?: number;
  regularPrice?: number | null;
  salePrice?: number | null;
  salePriceStart?: Date | null;
  salePriceEnd?: Date | null;
  manageStock: boolean;
  stockQuantity: number | null;
  backorders?: string | null;
  stockStatus?: string | null;
  shippingRequired?: boolean | null;
  virtual?: boolean | null;
  downloadable?: boolean | null;
  taxStatus?: string | null;
  taxClass?: string | null;
  shippingClassId?: string | null;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  categoryIds?: string[];
  categories?: Array<{ categoryId?: string }>;
}

export interface CartPricingVariant {
  id: string;
  name?: string | null;
  sku?: string | null;
  price?: number;
  regularPrice?: number;
  salePrice?: number | null;
  manageStock: boolean;
  stockQuantity: number | null;
  backorders?: string | null;
  stockStatus?: string | null;
  virtual?: boolean | null;
  downloadable?: boolean | null;
  lowStockAmount?: number | null;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  attributes?: unknown;
}

export interface ResolvedCartLine {
  price: number;
  regularPrice: number;
  onSale: boolean;
  lineTotal: number;
  availableStock: number | null;
  shippingRequired: boolean;
  downloadable: boolean;
  priceInfo: EffectiveProductPrice;
}

export function normalizeCartOptions(options: unknown): Record<string, string> {
  if (!options || typeof options !== "object" || Array.isArray(options)) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(options)) {
    if (value === null || value === undefined || value === "") continue;
    result[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
  }
  return result;
}

function readBundleChildren(meta: unknown): QuoteLine["bundleChildren"] {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return undefined;
  const raw = (meta as Record<string, unknown>).bundleChildren;
  if (!Array.isArray(raw)) return undefined;
  const children = raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const productId = typeof record.productId === "string" ? record.productId : "";
    const quantity = Math.max(1, Math.floor(Number(record.quantity ?? 1)));
    if (!productId || !Number.isFinite(quantity)) return [];
    return [{
      productId,
      quantity,
      variantId: typeof record.variantId === "string" ? record.variantId : null,
      name: typeof record.name === "string" ? record.name : null,
      sku: typeof record.sku === "string" ? record.sku : null,
    }];
  });
  return children.length > 0 ? children : undefined;
}

export function cartItemKey(
  productId: string,
  variantId?: string | null,
  options: unknown = {},
): string {
  const normalized = normalizeCartOptions(options);
  const sorted = Object.keys(normalized)
    .sort()
    .map((key) => `${key}:${normalized[key]}`)
    .join("|");
  return [productId, variantId ?? "base", sorted].filter(Boolean).join("::");
}

type StockSource = Pick<CartPricingProduct, "manageStock" | "stockQuantity"> & {
  backorders?: string | null;
  stockStatus?: string | null;
};

export function resolveStockSource(
  variant: CartPricingVariant | null | undefined,
  product: CartPricingProduct,
): StockSource {
  return variant && (variant.manageStock || !product.manageStock) ? variant : product;
}

export function matchCartVariant<T extends { id: string; productId: string }>(
  variants: T[],
  productId: string,
  variantId: string | null | undefined,
): T | null {
  if (!variantId) return null;
  return variants.find((variant) => variant.id === variantId && variant.productId === productId) ?? null;
}

export function parseCartQuantity(value: unknown, min = 1): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < min) return null;
  return Math.min(99, rounded);
}

export function availableStockFor(
  variant: CartPricingVariant | null | undefined,
  product: CartPricingProduct,
): number | null {
  const source = resolveStockSource(variant, product);
  if (!source.manageStock || source.stockQuantity === null) return null;
  if (source.backorders === "yes" || source.backorders === "notify") return null;
  return source.stockQuantity;
}

export function resolveCartLinePricing(
  product: CartPricingProduct,
  variant: CartPricingVariant | null | undefined,
  quantity: number,
  now: Date = new Date(),
): ResolvedCartLine {
  const productPriceFields = {
    price: Number(product.price ?? product.regularPrice ?? 0),
    regularPrice: Number(product.regularPrice ?? product.price ?? 0),
    salePrice: product.salePrice ?? null,
    salePriceStart: product.salePriceStart ?? null,
    salePriceEnd: product.salePriceEnd ?? null,
  };
  const priceInfo = variant
    ? getEffectiveVariantPrice(variant, now)
    : getEffectiveProductPrice(productPriceFields, now);
  const safeQuantity = Math.max(1, Math.floor(quantity));
  const shippingRequired = !(
    (variant?.virtual ?? product.virtual) ||
    (variant?.downloadable ?? product.downloadable)
  ) && (product.shippingRequired ?? true);

  return {
    price: priceInfo.price,
    regularPrice: priceInfo.regularPrice,
    onSale: priceInfo.onSale,
    lineTotal: priceInfo.price * safeQuantity,
    availableStock: availableStockFor(variant, product),
    shippingRequired,
    downloadable: variant?.downloadable ?? product.downloadable ?? false,
    priceInfo,
  };
}

type CartPricingItem = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: CartPricingProduct;
  variant: CartPricingVariant | null;
  meta?: unknown;
};

export function repriceCartItem<T extends CartPricingItem>(
  item: T,
  now: Date = new Date(),
): T & { price: number; lineTotal: number; pricing: ResolvedCartLine; line: QuoteLine } {
  const pricing = resolveCartLinePricing(item.product, item.variant, item.quantity, now);
  const bundleChildren = readBundleChildren(item.meta);
  const taxStatus = item.product.taxStatus ?? null;
  const normalizedTaxStatus = String(taxStatus ?? "").toUpperCase();
  const categoryIds = item.product.categoryIds
    ?? item.product.categories?.map((c) => c.categoryId).filter((id): id is string => Boolean(id))
    ?? [];
  const line: QuoteLine = {
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    unitPrice: pricing.price,
    saleItem: pricing.onSale,
    shippingRequired: pricing.shippingRequired,
    taxable: normalizedTaxStatus !== "NONE" && normalizedTaxStatus !== "NO_TAX",
    taxStatus,
    taxClass: item.product.taxClass ?? null,
    shippingClassId: item.product.shippingClassId ?? null,
    weight: item.variant?.weight ?? item.product.weight ?? null,
    length: item.variant?.length ?? item.product.length ?? null,
    width: item.variant?.width ?? item.product.width ?? null,
    height: item.variant?.height ?? item.product.height ?? null,
    couponEligible: true,
    categoryIds,
    ...(bundleChildren ? { bundleChildren } : {}),
  };

  return { ...item, price: pricing.price, lineTotal: pricing.lineTotal, pricing, line };
}
