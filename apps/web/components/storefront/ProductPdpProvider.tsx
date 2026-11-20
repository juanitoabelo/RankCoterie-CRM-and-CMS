"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ProductTemplateProductData } from "@/lib/product-template/types";
import { resolveProductBinding } from "@/lib/product-template/bindings";
import {
  findMatchingVariant,
  getInitialVariantOptions,
  normalizeVariantAttributes,
} from "@/modules/ecommerce/product-display";
import { ProductTemplateContext } from "./ProductTemplateContext";

export default function ProductPdpProvider({
  product,
  gateways,
  interactive = true,
  children,
}: {
  product: ProductTemplateProductData;
  gateways: Array<{ id: string; name: string; type: string }>;
  interactive?: boolean;
  children: ReactNode;
}) {
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    getInitialVariantOptions(variants),
  );
  const [quantity, setQuantityState] = useState(1);

  const selectedVariant = useMemo(
    () => findMatchingVariant(variants, selectedOptions),
    [variants, selectedOptions],
  );

  const resolveBinding = useCallback(
    (targetProduct: ProductTemplateProductData, binding: string) =>
      resolveProductBinding(targetProduct, binding, selectedVariant),
    [selectedVariant],
  );

  const selectOption = useCallback(
    (name: string, value: string) => {
      setSelectedOptions((current) => {
        const next = { ...current, [name]: value };
        const match = findMatchingVariant(variants, next);
        return match ? normalizeVariantAttributes(match.attributes) : next;
      });
    },
    [variants],
  );

  const selectVariant = useCallback(
    (variantId: string) => {
      const variant = variants.find((item) => item.id === variantId);
      if (variant) setSelectedOptions(normalizeVariantAttributes(variant.attributes));
    },
    [variants],
  );

  const setQuantity = useCallback((value: number) => {
    setQuantityState(Math.max(1, Math.min(99, Math.floor(value) || 1)));
  }, []);

  const effectivePrice = product.effectivePrice;
  const useVariantStock = Boolean(selectedVariant && (selectedVariant.manageStock || !product.manageStock));
  const stockSource = useVariantStock ? selectedVariant : product;
  const price = selectedVariant?.price ?? effectivePrice?.price ?? product.salePrice ?? product.regularPrice;
  const onSale = selectedVariant ? selectedVariant.onSale : effectivePrice?.onSale ?? false;
  const stockStatus = stockSource?.stockStatus ?? product.stockStatus;
  const stockQuantity = stockSource?.stockQuantity ?? product.stockQuantity ?? null;
  const manageStock = stockSource?.manageStock ?? product.manageStock ?? false;
  const backorders = stockSource?.backorders ?? product.backorders ?? "no";
  const lowStockAmount =
    (useVariantStock ? selectedVariant?.lowStockAmount : product.lowStockAmount) ??
    product.lowStockAmount ??
    5;
  const badges = useMemo(() => {
    const result: string[] = [];
    if (onSale) result.push("Sale");
    if (product.featured) result.push("Featured");
    if (stockStatus === "OUT_OF_STOCK") result.push("Out of stock");
    else if (
      manageStock &&
      stockQuantity !== null &&
      stockQuantity > 0 &&
      stockQuantity <= lowStockAmount
    ) {
      result.push("Low stock");
    }
    if (product.type === "EXTERNAL") result.push("External");
    else if (product.type === "SUBSCRIPTION") result.push("Subscription");
    else if (product.type === "SERVICE") result.push("Booking");
    else if (product.downloadable) result.push("Digital");
    return result;
  }, [
    onSale,
    product.featured,
    product.type,
    product.downloadable,
    stockStatus,
    manageStock,
    stockQuantity,
    lowStockAmount,
  ]);

  const value = useMemo(
    () => ({
      product,
      gateways,
      interactive,
      resolveBinding,
      selectedVariantId: selectedVariant?.id ?? null,
      selectedVariant: selectedVariant ?? null,
      selectedOptions,
      quantity,
      price,
      onSale,
      stockStatus,
      stockQuantity,
      manageStock,
      backorders,
      lowStockAmount,
      badges,
      setQuantity,
      selectOption,
      selectVariant,
    }),
    [
      product,
      gateways,
      interactive,
      resolveBinding,
      selectedVariant,
      selectedOptions,
      quantity,
      price,
      onSale,
      stockStatus,
      stockQuantity,
      manageStock,
      backorders,
      lowStockAmount,
      badges,
      setQuantity,
      selectOption,
      selectVariant,
    ],
  );

  return <ProductTemplateContext.Provider value={value}>{children}</ProductTemplateContext.Provider>;
}
