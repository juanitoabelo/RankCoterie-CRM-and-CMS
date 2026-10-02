"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { purchaseProduct } from "@/app/(site)/checkout/actions";
import { notifyCartUpdated } from "@/lib/cart-event";

export type PurchaseGateway = {
  id: string;
  name: string;
  type: string;
};

const GATEWAY_HINTS: Record<string, string> = {
  STRIPE: "Pay securely with card via Stripe",
  PAYPAL: "Pay with PayPal",
  SQUARE: "Pay with Square",
  MANUAL: "Pay offline / cash on delivery",
};

export default function ProductPurchase({
  productId,
  gateways,
}: {
  productId: string;
  gateways: PurchaseGateway[];
}) {
  const [message, setMessage] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  // One token per buy-now attempt — the server dedupes double-submits with it.
  const [checkoutToken] = useState(() => crypto.randomUUID());
  const router = useRouter();

  if (gateways.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Payments are not available yet — no payment gateway is enabled for this store.
      </div>
    );
  }

  const addToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    setMessage(null);
    try {
      const qtyInput = e.currentTarget.form?.elements.namedItem("quantity") as HTMLInputElement | null;
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: parseInt(qtyInput?.value ?? "1", 10) || 1 }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; itemCount?: number };
      if (json.ok) {
        notifyCartUpdated(json.itemCount);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 2200);
      } else {
        setMessage({ ok: false, error: json.error ?? "Failed to add to cart." });
      }
    } catch {
      setMessage({ ok: false, error: "Failed to add to cart." });
    } finally {
      setAdding(false);
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    formData.set("productId", productId);
    startTransition(async () => {
      try {
        const result = await purchaseProduct(formData);
        if (result.ok) {
          if (/^https?:\/\//.test(result.url)) {
            window.location.assign(result.url);
          } else {
            router.push(result.url);
          }
        } else {
          setMessage({ ok: false, error: result.error });
        }
      } catch (err) {
        setMessage({ ok: false, error: err instanceof Error ? err.message : "Checkout failed." });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-zinc-200 bg-white p-5">
      <input type="hidden" name="checkoutToken" value={checkoutToken} />
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Payment method
      </h2>

      {message && (
        <p className={`mt-3 text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "" : message.error}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {gateways.map((gw, i) => (
          <label
            key={gw.id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 hover:border-zinc-400"
          >
            <input
              type="radio"
              name="gatewayId"
              value={gw.id}
              defaultChecked={i === 0}
              className="mt-0.5 h-4 w-4 border-zinc-300"
            />
            <span>
              <span className="block text-sm font-medium text-zinc-900">{gw.name}</span>
              <span className="block text-xs text-zinc-500">
                {GATEWAY_HINTS[gw.type] ?? gw.type}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600" htmlFor="buy-qty">
              Qty
            </label>
            <input
              id="buy-qty"
              type="number"
              name="quantity"
              min={1}
              max={999}
              defaultValue={1}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600" htmlFor="buy-email">
              Email <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              id="buy-email"
              type="email"
              name="email"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {isPending ? "Processing…" : "Buy now"}
        </button>
        <button
          type="button"
          disabled={adding}
          onClick={addToCart}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          {added ? "Added to cart ✓" : adding ? "Adding…" : "Add to cart"}
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-zinc-400">
        You&apos;ll be redirected to complete payment securely.
      </p>
    </form>
  );
}
