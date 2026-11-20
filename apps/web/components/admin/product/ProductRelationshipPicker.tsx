"use client";

import { useState } from "react";
import type { ProductLinkField } from "@/modules/ecommerce/product-form";
import type { ProductType } from "@/modules/ecommerce/types";

const selectCls = "mt-1 h-40 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";

const FIELDS: { field: ProductLinkField; label: string; hint: string }[] = [
  { field: "relatedProductIds", label: "Related products", hint: "Shown alongside this product." },
  { field: "crossSellProductIds", label: "Cross-sells", hint: "Suggested in the cart." },
  { field: "upSellProductIds", label: "Up-sells", hint: "Premium alternatives." },
  { field: "bundleChildIds", label: "Bundle items", hint: "Products included in this bundle." },
  { field: "groupedChildIds", label: "Grouped items", hint: "Products sold from this group." },
];

type ProductOption = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  type: ProductType;
};

type Values = Record<ProductLinkField, string[]>;

export default function ProductRelationshipPicker({
  productOptions,
  currentProductId,
  initial,
}: {
  productOptions: ProductOption[];
  currentProductId: string | null;
  initial: Values;
}) {
  const [values, setValues] = useState<Values>(initial);

  function update(field: ProductLinkField, next: string[]) {
    setValues((prev) => ({ ...prev, [field]: next }));
  }

  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-5">
      <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Product relationships
      </summary>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {FIELDS.map(({ field, label, hint }) => (
          <div key={field}>
            <label className={labelCls} htmlFor={field}>
              {label}
            </label>
            <p className="mt-1 text-xs text-zinc-500">{hint}</p>
            <select
              id={field}
              name={field}
              multiple
              className={selectCls}
              value={values[field] ?? []}
              onChange={(event) =>
                update(field, Array.from(event.target.selectedOptions, (option) => option.value))
              }
            >
              {productOptions.map((option) => (
                <option key={option.id} value={option.id} disabled={option.id === currentProductId}>
                  {option.name}
                  {option.sku ? ` (${option.sku})` : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">Hold Cmd/Ctrl to select multiple products.</p>
          </div>
        ))}
      </div>
    </details>
  );
}
