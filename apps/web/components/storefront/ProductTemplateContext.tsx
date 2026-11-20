"use client";

import { createContext, useContext } from "react";
import type {
  ProductTemplateProductData,
  ProductTemplateVariant,
} from "@/lib/product-template/types";
import type { resolveProductBinding } from "@/lib/product-template/bindings";

export interface ProductTemplateContextValue {
  product: ProductTemplateProductData;
  gateways: Array<{ id: string; name: string; type: string }>;
  interactive: boolean;
  resolveBinding: typeof resolveProductBinding;
  selectedVariantId: string | null;
  selectedVariant: ProductTemplateVariant | null;
  selectedOptions: Record<string, string>;
  quantity: number;
  price: number;
  onSale: boolean;
  stockStatus: string;
  stockQuantity: number | null;
  manageStock: boolean;
  backorders: string;
  lowStockAmount: number;
  badges: string[];
  setQuantity: (quantity: number) => void;
  selectOption: (name: string, value: string) => void;
  selectVariant: (variantId: string) => void;
}

export const ProductTemplateContext = createContext<ProductTemplateContextValue | null>(null);

export function useProductTemplateContext(): ProductTemplateContextValue | null {
  return useContext(ProductTemplateContext);
}
