"use client";

import { useState } from "react";
import type { ProductVariantFormInput, StockStatus } from "@/modules/ecommerce/types";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";

type VariantRow = Omit<ProductVariantFormInput, "attributes"> & { attributes: unknown };

function toRow(variant: ProductVariantFormInput, index: number): VariantRow {
  return {
    ...variant,
    menuOrder: variant.menuOrder ?? index,
    attributes: JSON.stringify(variant.attributes ?? {}),
  };
}

function newVariant(index: number): VariantRow {
  return {
    name: "",
    sku: "",
    regularPrice: 0,
    salePrice: null,
    stockStatus: "IN_STOCK" as StockStatus,
    stockQuantity: null,
    manageStock: false,
    backorders: "no",
    lowStockAmount: null,
    weight: null,
    length: null,
    width: null,
    height: null,
    imageAssetId: null,
    downloadable: false,
    downloadLimit: null,
    downloadExpiry: null,
    downloadFiles: [],
    virtual: false,
    description: "",
    purchaseNote: "",
    menuOrder: index,
    attributes: "{}",
  };
}

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function VariantEditor({
  initialVariants,
}: {
  initialVariants: ProductVariantFormInput[];
}) {
  const [rows, setRows] = useState<VariantRow[]>(() => initialVariants.map(toRow));

  function update(index: number, patch: Partial<VariantRow>) {
    setRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function remove(index: number) {
    setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, menuOrder: rowIndex })));
  }

  function add() {
    setRows((prev) => [...prev, newVariant(prev.length)]);
  }

  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-5" open={rows.length > 0}>
      <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Variants
      </summary>
      <input type="hidden" name="variantData" value={JSON.stringify(rows)} />
      <div className="mt-4 space-y-4">
        {rows.length === 0 && (
          <p className="text-sm text-zinc-500">No variants yet. Add one to sell options such as size or colour.</p>
        )}
        {rows.map((row, index) => (
          <details key={row.id ?? `new-${index}`} className="rounded-lg border border-zinc-200 p-4">
            <summary className="cursor-pointer text-sm font-medium text-zinc-800">
              {row.name || row.sku || `Variant ${index + 1}`}
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelCls}>Name</label>
                <input
                  className={inputCls}
                  value={row.name}
                  onChange={(event) => update(index, { name: event.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>SKU</label>
                <input
                  className={inputCls}
                  value={row.sku}
                  onChange={(event) => update(index, { sku: event.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Regular price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  value={row.regularPrice}
                  onChange={(event) => update(index, { regularPrice: Number(event.target.value) || 0 })}
                />
              </div>
              <div>
                <label className={labelCls}>Sale price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  value={row.salePrice ?? ""}
                  onChange={(event) => update(index, { salePrice: numberOrNull(event.target.value) })}
                />
              </div>
              <div>
                <label className={labelCls}>Stock status</label>
                <select
                  className={inputCls}
                  value={row.stockStatus}
                  onChange={(event) => update(index, { stockStatus: event.target.value as StockStatus })}
                >
                  <option value="IN_STOCK">In stock</option>
                  <option value="OUT_OF_STOCK">Out of stock</option>
                  <option value="ON_BACKORDER">On backorder</option>
                  <option value="LOW_STOCK">Low stock</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Stock quantity</label>
                <input
                  type="number"
                  className={inputCls}
                  value={row.stockQuantity ?? ""}
                  onChange={(event) => update(index, { stockQuantity: numberOrNull(event.target.value) })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Attributes (JSON object)</label>
                <input
                  className={`${inputCls} font-mono text-xs`}
                  value={String(row.attributes ?? "{}")}
                  onChange={(event) => update(index, { attributes: event.target.value })}
                  placeholder={'{"Size":"M"} '}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Image asset id</label>
                <input
                  className={inputCls}
                  value={row.imageAssetId ?? ""}
                  onChange={(event) => update(index, { imageAssetId: event.target.value.trim() || null })}
                  placeholder="asset id"
                />
              </div>
              <div className="flex items-end gap-6 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={row.manageStock}
                    onChange={(event) => update(index, { manageStock: event.target.checked })}
                    className="h-4 w-4 rounded border-zinc-400"
                  />
                  Manage stock
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={row.downloadable}
                    onChange={(event) => update(index, { downloadable: event.target.checked })}
                    className="h-4 w-4 rounded border-zinc-400"
                  />
                  Downloadable
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={row.virtual}
                    onChange={(event) => update(index, { virtual: event.target.checked })}
                    className="h-4 w-4 rounded border-zinc-400"
                  />
                  Virtual
                </label>
              </div>
              <div>
                <label className={labelCls}>Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputCls}
                  value={row.weight ?? ""}
                  onChange={(event) => update(index, { weight: numberOrNull(event.target.value) })}
                />
              </div>
              <div>
                <label className={labelCls}>Backorders</label>
                <input
                  className={inputCls}
                  value={row.backorders}
                  onChange={(event) => update(index, { backorders: event.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Low stock threshold</label>
                <input
                  type="number"
                  className={inputCls}
                  value={row.lowStockAmount ?? ""}
                  onChange={(event) => update(index, { lowStockAmount: numberOrNull(event.target.value) })}
                />
              </div>
              <div>
                <label className={labelCls}>Length / width / height</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="0.1"
                    aria-label="Length"
                    className={inputCls}
                    value={row.length ?? ""}
                    onChange={(event) => update(index, { length: numberOrNull(event.target.value) })}
                  />
                  <input
                    type="number"
                    step="0.1"
                    aria-label="Width"
                    className={inputCls}
                    value={row.width ?? ""}
                    onChange={(event) => update(index, { width: numberOrNull(event.target.value) })}
                  />
                  <input
                    type="number"
                    step="0.1"
                    aria-label="Height"
                    className={inputCls}
                    value={row.height ?? ""}
                    onChange={(event) => update(index, { height: numberOrNull(event.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Download limit</label>
                <input
                  type="number"
                  className={inputCls}
                  value={row.downloadLimit ?? ""}
                  onChange={(event) => update(index, { downloadLimit: numberOrNull(event.target.value) })}
                />
              </div>
              <div>
                <label className={labelCls}>Download expiry (days)</label>
                <input
                  type="number"
                  className={inputCls}
                  value={row.downloadExpiry ?? ""}
                  onChange={(event) => update(index, { downloadExpiry: numberOrNull(event.target.value) })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Description</label>
                <input
                  className={inputCls}
                  value={row.description}
                  onChange={(event) => update(index, { description: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Purchase note</label>
                <input
                  className={inputCls}
                  value={row.purchaseNote}
                  onChange={(event) => update(index, { purchaseNote: event.target.value })}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className="mt-4 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Remove variant
            </button>
          </details>
        ))}
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Add variant
        </button>
      </div>
    </details>
  );
}
