import type { EffectiveProductPrice } from "./pricing";
import { getEffectiveProductPrice } from "./pricing";

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
}

export interface CartPricingVariant {
  id: string;
  price?: number;
  regularPrice?: number;
  salePrice?: number | null;
  manageStock: boolean;
  stockQuantity: number | null;
  backorders?: string | null;
  stockStatus?: string | null;
  virtual?: boolean | null;
  downloadable?: boolean | null;
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
    ? {
        price:
          variant.salePrice !== null && variant.salePrice !== undefined
            ? Number(variant.salePrice)
            : Number(variant.price ?? variant.regularPrice ?? 0),
        regularPrice: Number(variant.regularPrice ?? variant.price ?? 0),
        salePrice: variant.salePrice ?? null,
        onSale: variant.salePrice !== null && variant.salePrice !== undefined,
        saleEndsAt: null,
      }
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
