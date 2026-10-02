"use client";

import { useState, useTransition } from "react";
import {
  lookupOrder,
  lookupOrdersByEmail,
  type OrderHistoryResult,
  type OrderLookupResult,
} from "@/app/(site)/orders/actions";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting payment",
  PROCESSING: "Processing",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

export default function OrderLookup({ initialOrderNumber = "" }: { initialOrderNumber?: string }) {
  const [result, setResult] = useState<OrderLookupResult | null>(null);
  const [history, setHistory] = useState<OrderHistoryResult | null>(null);
  const [activeEmail, setActiveEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  const showOrder = (orderNumber: string, email: string) => {
    startTransition(async () => {
      const res = await lookupOrder(orderNumber, email);
      setResult(res);
      if (res.ok) setHistory(null);
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const orderNumber = String(data.get("orderNumber") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    startTransition(async () => {
      if (!orderNumber) {
        // Email-only: show this customer's order history.
        const res = await lookupOrdersByEmail(email);
        setHistory(res);
        setResult(null);
        if (res.ok) setActiveEmail(email);
        return;
      }
      const res = await lookupOrder(orderNumber, email);
      setResult(res);
      setHistory(null);
    });
  };

  const order = result?.ok ? result.order : null;

  return (
    <div className="mx-auto max-w-xl">
      <form onSubmit={onSubmit} className="rounded-xl border border-zinc-200 bg-white p-5">
        <div>
          <label className="block text-sm font-medium text-zinc-700" htmlFor="orderNumber">
            Order number <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            id="orderNumber"
            name="orderNumber"
            type="text"
            defaultValue={initialOrderNumber}
            placeholder="CNP-… — leave blank to see all orders"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-zinc-700" htmlFor="email">
            Email used at checkout
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {isPending ? "Looking up…" : "Find my orders"}
        </button>
        {result && !result.ok && (
          <p className="mt-3 text-sm text-red-600">{result.error}</p>
        )}
        {history && !history.ok && (
          <p className="mt-3 text-sm text-red-600">{history.error}</p>
        )}
      </form>

      {history?.ok && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Orders for {activeEmail}
            </h2>
            <button
              type="button"
              onClick={() => setHistory(null)}
              className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline"
            >
              Clear
            </button>
          </div>
          {history.orders.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">No orders found for that email.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {history.orders.map((item) => (
                <li key={item.orderNumber}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => showOrder(item.orderNumber, activeEmail)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-zinc-50 disabled:opacity-60"
                  >
                    <span>
                      <span className="block text-sm font-medium text-zinc-900">
                        {item.orderNumber}
                      </span>
                      <span className="block text-xs text-zinc-500">
                        {new Date(item.createdAt).toLocaleDateString()} · {item.itemCount} item
                        {item.itemCount === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-right">
                      <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                        {STATUS_LABELS[item.status] ?? item.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-zinc-900">
                        ${item.total.toFixed(2)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {order && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-zinc-900">{order.orderNumber}</p>
              <p className="text-xs text-zinc-500">
                Placed {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
              {STATUS_LABELS[order.status] ?? order.status.replace(/_/g, " ")}
            </span>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Payment</dt>
              <dd className="text-right text-zinc-900">
                {order.paymentStatus.replace(/_/g, " ")}
                {order.paidAt ? ` · ${new Date(order.paidAt).toLocaleString()}` : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Fulfillment</dt>
              <dd className="text-right text-zinc-900">
                {order.fulfillmentStatus.replace(/_/g, " ")}
              </dd>
            </div>
          </dl>

          {order.tracking && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
              <p className="font-medium text-zinc-900">
                {order.tracking.carrier ? `${order.tracking.carrier} · ` : ""}
                {order.tracking.trackingNumber}
              </p>
              {order.tracking.trackingUrl && (
                <a
                  href={order.tracking.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                >
                  Track package →
                </a>
              )}
            </div>
          )}

          <ul className="mt-4 divide-y divide-zinc-100 border-t border-zinc-100">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-3 py-2 text-sm">
                <span className="text-zinc-700">
                  {item.name} <span className="text-zinc-400">× {item.quantity}</span>
                </span>
                <span className="tabular-nums text-zinc-900">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 text-sm font-semibold text-zinc-900">
            <span>Total</span>
            <span className="tabular-nums">
              ${order.total.toFixed(2)} {order.currency}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
