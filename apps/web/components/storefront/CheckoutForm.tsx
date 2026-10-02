"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkoutCart, quoteCartTotals } from "@/app/(site)/checkout/actions";
import { notifyCartUpdated } from "@/lib/cart-event";
import type { QuoteTotals } from "@/lib/billing/totals";
import CouponBox from "./CouponBox";

type Gateway = { id: string; name: string; type: string };

const GATEWAY_HINTS: Record<string, string> = {
  STRIPE: "Pay securely with card via Stripe",
  PAYPAL: "Pay with PayPal",
  SQUARE: "Pay securely with card via Square",
  MANUAL: "Pay offline / cash on delivery",
};

function TotalsBreakdown({ totals }: { totals: QuoteTotals }) {
  return (
    <dl className="mt-5 space-y-1.5 border-t border-zinc-100 pt-4 text-sm">
      <div className="flex justify-between">
        <dt className="text-zinc-600">Subtotal</dt>
        <dd className="font-medium text-zinc-900 tabular-nums">${totals.subtotal.toFixed(2)}</dd>
      </div>
      {totals.discount > 0 && (
        <div className="flex justify-between text-emerald-700">
          <dt>Discount{totals.coupon ? ` (${totals.coupon.code})` : ""}</dt>
          <dd className="font-medium tabular-nums">−${totals.discount.toFixed(2)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-zinc-600">Shipping</dt>
        <dd className="font-medium text-zinc-900 tabular-nums">
          {totals.shipping > 0 ? `$${totals.shipping.toFixed(2)}` : totals.shippingLabel}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-zinc-600">
          Tax
          {totals.taxRate > 0
            ? ` (${totals.taxRate}%${totals.pricesIncludeTax ? " included" : ""})`
            : ""}
        </dt>
        <dd className="font-medium text-zinc-900 tabular-nums">
          {totals.tax > 0 ? `$${totals.tax.toFixed(2)}` : "—"}
        </dd>
      </div>
      <div className="flex justify-between border-t border-zinc-100 pt-2 text-base">
        <dt className="font-semibold text-zinc-900">Total</dt>
        <dd className="font-semibold text-zinc-900 tabular-nums">${totals.total.toFixed(2)}</dd>
      </div>
    </dl>
  );
}

export default function CheckoutForm({
  gateways,
  initialTotals,
  couponCode,
}: {
  gateways: Gateway[];
  initialTotals: QuoteTotals;
  couponCode: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<QuoteTotals>(initialTotals);
  // One token per checkout attempt — the server dedupes double-submits with it.
  const [checkoutToken] = useState(() => crypto.randomUUID());
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isQuoting, startQuote] = useTransition();
  const router = useRouter();
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    // Coupon changed (applied/removed via refresh) — re-quote with current address.
    setTotals(initialTotals);
    const fd = new FormData();
    fd.set("country", country);
    fd.set("state", state);
    startQuote(async () => {
      const result = await quoteCartTotals(fd);
      if (result.ok) setTotals(result.totals);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTotals]);

  const requote = () => {
    const fd = new FormData();
    fd.set("country", country);
    fd.set("state", state);
    startQuote(async () => {
      const result = await quoteCartTotals(fd);
      if (result.ok) setTotals(result.totals);
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await checkoutCart(formData);
        if (result.ok) {
          notifyCartUpdated();
          if (/^https?:\/\//.test(result.url)) {
            window.location.assign(result.url);
          } else {
            router.push(result.url);
          }
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Checkout failed.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-zinc-200 bg-white p-5">
      <input type="hidden" name="checkoutToken" value={checkoutToken} />
      <div>
        <label className="block text-xs font-medium text-zinc-600" htmlFor="checkout-email">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="checkout-email"
          type="email"
          name="email"
          required
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="you@example.com"
        />
        <p className="mt-1 text-xs text-zinc-400">We&apos;ll send your order confirmation here.</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600" htmlFor="checkout-country">
            Country / Region
          </label>
          <input
            id="checkout-country"
            type="text"
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            onBlur={requote}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="e.g. US"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600" htmlFor="checkout-state">
            State / Region
          </label>
          <input
            id="checkout-state"
            type="text"
            name="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            onBlur={requote}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="e.g. CA"
          />
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-400">Used to calculate tax and shipping.</p>

      <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Coupon
      </h2>
      <CouponBox couponCode={couponCode} couponError={initialTotals.couponError} />

      <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Payment method
      </h2>
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

      <TotalsBreakdown totals={totals} />
      {isQuoting && <p className="mt-2 text-xs text-zinc-400">Updating totals…</p>}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="mt-5 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {isPending ? "Processing…" : `Place order — $${totals.total.toFixed(2)}`}
      </button>
      <p className="mt-2 text-center text-xs text-zinc-400">
        You&apos;ll be redirected to complete payment securely.
      </p>
    </form>
  );
}
