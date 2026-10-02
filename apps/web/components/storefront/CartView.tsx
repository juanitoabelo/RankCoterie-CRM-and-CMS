"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { notifyCartUpdated } from "@/lib/cart-event";
import { quoteCartTotals } from "@/app/(site)/checkout/actions";
import type { QuoteTotals } from "@/lib/billing/totals";
import CouponBox from "./CouponBox";

type CartItem = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  imageAssetId: string | null;
  price: number;
  quantity: number;
  lineTotal: number;
  stockStatus: string;
  manageStock: boolean;
  stockQuantity: number | null;
  backorders: string;
  lowStockAmount: number | null;
};

type CartResponse = {
  ok: boolean;
  error?: string;
  warning?: string;
  itemCount?: number;
  total?: number;
  items?: CartItem[];
};

export default function CartView({
  items: initialItems,
  initialTotals,
  couponCode,
  couponError,
}: {
  items: CartItem[];
  initialTotals: QuoteTotals;
  couponCode: string | null;
  couponError?: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [totals, setTotals] = useState<QuoteTotals>(initialTotals);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [, startQuote] = useTransition();

  // Server refresh (coupon applied/removed, qty edits server-side) — sync down
  // during render when the prop identity changes (React-safe pattern).
  const [syncedInitial, setSyncedInitial] = useState({ items: initialItems, totals: initialTotals });
  if (syncedInitial.items !== initialItems || syncedInitial.totals !== initialTotals) {
    setSyncedInitial({ items: initialItems, totals: initialTotals });
    setItems(initialItems);
    setTotals(initialTotals);
  }

  const requote = () => {
    startQuote(async () => {
      const result = await quoteCartTotals(new FormData());
      if (result.ok) setTotals(result.totals);
    });
  };

  const applyResponse = (json: CartResponse) => {
    if (!json.ok) {
      setError(json.error ?? "Cart update failed.");
      setWarning(json.warning ?? null);
      return;
    }
    setError(null);
    setWarning(json.warning ?? null);
    setItems(json.items ?? []);
    notifyCartUpdated(json.itemCount);
    requote();
  };

  const setQuantity = (item: CartItem, quantity: number) => {
    if (busyId) return;
    if (quantity < 1) return;
    setBusyId(item.id);
    startTransition(async () => {
      try {
        const res = await fetch("/api/cart", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: item.id, quantity }),
        });
        applyResponse((await res.json()) as CartResponse);
      } catch {
        setError("Could not update the cart. Please try again.");
      } finally {
        setBusyId(null);
      }
    });
  };

  const removeItem = (item: CartItem) => {
    if (busyId) return;
    setBusyId(item.id);
    startTransition(async () => {
      try {
        const res = await fetch("/api/cart", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: item.id }),
        });
        applyResponse((await res.json()) as CartResponse);
      } catch {
        setError("Could not remove the item. Please try again.");
      } finally {
        setBusyId(null);
      }
    });
  };

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {error && (
          <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}
        {warning && (
          <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            {warning}
          </p>
        )}
        {items.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-zinc-700">Your cart is empty</p>
            <Link
              href="/"
              className="mt-3 inline-block text-sm text-zinc-500 hover:text-zinc-900 hover:underline"
            >
              Continue shopping
            </Link>
          </div>
        )}
        <ul className="divide-y divide-zinc-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 px-4 py-4">
              <Link href={`/${item.slug}`} className="shrink-0">
                {item.imageAssetId ? (
                  <img
                    src={`/api/assets/${item.imageAssetId}`}
                    alt={item.name}
                    className="h-16 w-16 rounded-lg border border-zinc-200 bg-zinc-50 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-400">
                    No img
                  </div>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/${item.slug}`}
                  className="block truncate text-sm font-medium text-zinc-900 hover:underline"
                >
                  {item.name}
                </Link>
                <p className="mt-0.5 text-sm text-zinc-500">${item.price.toFixed(2)} each</p>
                {(() => {
                  const backorderOk = item.backorders === "yes" || item.backorders === "notify";
                  const left =
                    item.manageStock && !backorderOk && item.stockQuantity !== null
                      ? item.stockQuantity
                      : null;
                  if (left !== null && left <= 0) {
                    return (
                      <p className="mt-0.5 text-xs font-medium text-red-600">Out of stock</p>
                    );
                  }
                  if (item.stockStatus === "OUT_OF_STOCK") {
                    return (
                      <p className="mt-0.5 text-xs font-medium text-red-600">Out of stock</p>
                    );
                  }
                  const threshold = item.lowStockAmount ?? 5;
                  if (left !== null && left <= threshold) {
                    return (
                      <p className="mt-0.5 text-xs font-medium text-amber-600">
                        Only {left} left in stock
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={busyId === item.id}
                  onClick={() => setQuantity(item, item.quantity - 1)}
                  className="h-8 w-8 rounded-l-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  −
                </button>
                <span className="flex h-8 w-10 items-center justify-center border-y border-zinc-300 bg-white text-sm tabular-nums">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={busyId === item.id}
                  onClick={() => setQuantity(item, item.quantity + 1)}
                  className="h-8 w-8 rounded-r-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  +
                </button>
              </div>

              <div className="w-24 text-right text-sm font-semibold text-zinc-900 tabular-nums">
                ${item.lineTotal.toFixed(2)}
              </div>

              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                disabled={busyId === item.id}
                onClick={() => removeItem(item)}
                className="text-zinc-400 hover:text-red-600 disabled:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Summary</h2>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-zinc-600">
            Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} items)
          </span>
          <span className="font-semibold text-zinc-900 tabular-nums">
            ${totals.subtotal.toFixed(2)}
          </span>
        </div>

        <CouponBox couponCode={couponCode} couponError={couponError} />

        {totals.discount > 0 && (
          <div className="mt-3 flex items-center justify-between text-sm text-emerald-700">
            <span>
              Discount{totals.coupon ? ` (${totals.coupon.code})` : ""}
            </span>
            <span className="font-medium tabular-nums">−${totals.discount.toFixed(2)}</span>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-zinc-600">Shipping</span>
          <span className="font-medium text-zinc-900 tabular-nums">
            {totals.shipping > 0 ? `$${totals.shipping.toFixed(2)}` : totals.shippingLabel}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 text-sm font-semibold">
          <span className="text-zinc-900">Total</span>
          <span className="text-zinc-900 tabular-nums">${totals.total.toFixed(2)}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          {totals.pricesIncludeTax
            ? `Prices include tax${totals.taxRate > 0 ? ` (${totals.taxRate}%)` : ""}.`
            : "Tax is calculated at checkout based on your country / region."}
        </p>

        {items.length > 0 ? (
          <Link
            href="/checkout"
            className="mt-4 block w-full rounded-lg bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-700"
          >
            Proceed to checkout
          </Link>
        ) : (
          <div className="mt-4 block w-full rounded-lg bg-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-400">
            Proceed to checkout
          </div>
        )}
        <Link
          href="/"
          className="mt-2 block w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
