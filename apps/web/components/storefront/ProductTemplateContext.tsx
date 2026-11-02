"use client";

import { createContext, useContext } from "react";
import type { ProductTemplateProductData } from "@/lib/product-template/types";
import type { resolveProductBinding } from "@/lib/product-template/bindings";

export interface ProductTemplateContextValue {
  product: ProductTemplateProductData;
  gateways: Array<{ id: string; name: string; type: string }>;
  interactive: boolean;
  resolveBinding: typeof resolveProductBinding;
}

export const ProductTemplateContext = createContext<ProductTemplateContextValue | null>(null);

export function useProductTemplateContext(): ProductTemplateContextValue | null {
  return useContext(ProductTemplateContext);
}
