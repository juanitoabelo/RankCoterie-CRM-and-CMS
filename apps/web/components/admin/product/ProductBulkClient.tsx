"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductStatus, ProductType } from "@/modules/ecommerce/types";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  type: ProductType;
  status: ProductStatus;
  price: number;
  stockStatus: string;
  featured: boolean;
  createdAt: Date;
};

const valueOptions: Record<string, { value: string; label: string }[]> = {
  status: [
    { value: "DRAFT", label: "Draft" },
    { value: "PENDING_REVIEW", label: "Pending review" },
    { value: "PUBLISHED", label: "Published" },
    { value: "PRIVATE", label: "Private" },
  ],
  featured: [
    { value: "true", label: "Featured" },
    { value: "false", label: "Not featured" },
  ],
};

export default function ProductBulkClient({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? products.map((product) => product.id) : []);
  }

  function toggle(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedIds.length || !action || !value) return;
    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      selectedIds.forEach((id) => formData.append("ids", id));
      formData.append("action", action);
      formData.append("value", value);
      const response = await fetch("/api/admin/products/bulk", { method: "POST", body: formData });
      const data = await response.json();
      if (data.ok) {
        setMessage({ type: "success", text: `Successfully updated ${data.count} product(s)` });
        setSelectedIds([]);
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error ?? "Bulk update failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to process request" });
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (!selectedIds.length) {
      setMessage({ type: "error", text: "Select at least one product to export" });
      return;
    }
    setMessage(null);
    try {
      const formData = new FormData();
      selectedIds.forEach((id) => formData.append("ids", id));
      const response = await fetch("/api/admin/products/export", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `products-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setMessage({ type: "error", text: "Export failed" });
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Bulk Actions</h1>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Export CSV
        </button>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-lg p-4 ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={products.length > 0 && selectedIds.length === products.length}
                onChange={(event) => toggleAll(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <span className="font-medium text-zinc-900">Select all</span>
              {selectedIds.length > 0 && (
                <span className="ml-2 text-sm text-zinc-500">({selectedIds.length} selected)</span>
              )}
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="p-3" />
                  <th className="p-3 font-medium text-zinc-500">Product</th>
                  <th className="p-3 font-medium text-zinc-500">Type</th>
                  <th className="p-3 font-medium text-zinc-500">Status</th>
                  <th className="p-3 text-right font-medium text-zinc-500">Price</th>
                  <th className="p-3 font-medium text-zinc-500">Stock</th>
                  <th className="p-3 font-medium text-zinc-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-zinc-50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        name="ids"
                        value={product.id}
                        checked={selectedIds.includes(product.id)}
                        onChange={(event) => toggle(product.id, event.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-zinc-900">{product.name}</div>
                      <div className="text-xs text-zinc-500">{product.sku || product.slug}</div>
                    </td>
                    <td className="p-3 text-zinc-600">{product.type.replace(/_/g, " ")}</td>
                    <td className="p-3 text-zinc-600">{product.status.replace(/_/g, " ")}</td>
                    <td className="p-3 text-right tabular-nums">${product.price.toFixed(2)}</td>
                    <td className="p-3 text-zinc-600">{product.stockStatus.replace(/_/g, " ")}</td>
                    <td className="p-3 text-zinc-500">{product.createdAt.toISOString().split("T")[0]}</td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-zinc-500">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Bulk action</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700" htmlFor="bulk-action">
                Action
              </label>
              <select
                id="bulk-action"
                value={action}
                onChange={(event) => {
                  setAction(event.target.value);
                  setValue("");
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Select action</option>
                <option value="status">Change status</option>
                <option value="featured">Set featured</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700" htmlFor="bulk-value">
                Value
              </label>
              <select
                id="bulk-value"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                required
                disabled={!action}
              >
                <option value="">Select value</option>
                {(valueOptions[action] ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={!selectedIds.length || !action || !value || loading}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Processing..." : "Apply to selected"}
          </button>
        </div>
      </form>
    </div>
  );
}
