import { isSaleActive } from "./product-form";

export interface ProductPriceFields {
  price: number;
  regularPrice: number;
  salePrice: number | null;
  salePriceStart?: Date | null;
  salePriceEnd?: Date | null;
}

export interface EffectiveProductPrice {
  price: number;
  regularPrice: number;
  salePrice: number | null;
  onSale: boolean;
  saleEndsAt: Date | null;
}

export function getEffectiveProductPrice(
  product: ProductPriceFields,
  now: Date = new Date(),
): EffectiveProductPrice {
  const regularPrice = Number(product.regularPrice);
  const salePrice = product.salePrice === null || product.salePrice === undefined
    ? null
    : Number(product.salePrice);
  const onSale = isSaleActive(salePrice, product.salePriceStart, product.salePriceEnd, now);
  const saleEndsAt = onSale ? product.salePriceEnd ?? null : null;

  return {
    price: onSale && salePrice !== null ? salePrice : regularPrice,
    regularPrice,
    salePrice,
    onSale,
    saleEndsAt,
  };
}
