"use client";

import { useMemo } from "react";
import { formatProductPrice, getStockLabel, getVariantOptions } from "@/modules/ecommerce/product-display";
import { useProductTemplateContext } from "./ProductTemplateContext";

export default function ProductVariantSelector() {
  const context = useProductTemplateContext();
  const product = context?.product;
  const variants = useMemo(() => product?.variants ?? [], [product?.variants]);
  const options = useMemo(() => getVariantOptions(variants), [variants]);
  if (!context || options.length === 0) return null;

  return (
    <div className="pdp-variant-options">
      {options.map((option) => (
        <fieldset key={option.name} className="pdp-variant-group">
          <legend>{option.name}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {option.values.map((value) => {
              const selected = context.selectedOptions[option.name] === value.value;
              return (
                <button
                  key={value.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => context.selectOption(option.name, value.value)}
                  className={`pdp-variant-chip ${selected ? "pdp-variant-chip-active" : ""}`}
                >
                  {value.value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {context.selectedVariant ? (
        <div className="pdp-variant-summary">
          <p className="pdp-variant-sku">
            {context.selectedVariant.sku ? `SKU: ${context.selectedVariant.sku}` : context.selectedVariant.name}
          </p>
          <p className="pdp-variant-price">{formatProductPrice(context.price)}</p>
          <p className="pdp-variant-stock">
            {getStockLabel(
              context.stockStatus,
              context.manageStock,
              context.stockQuantity,
              context.backorders,
              context.lowStockAmount,
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
