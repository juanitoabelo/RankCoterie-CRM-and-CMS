"use client";

import { useState } from "react";
import type { DownloadGrantView, OrderLookupView } from "@/lib/checkout/customer-access";
import { lookupOrderWithAccess } from "@/app/(site)/orders/access-actions";
import DownloadGrants from "./DownloadGrants";

export default function OrderAccessLookup({
  initialOrderId = "",
  initialAccess = "",
}: {
  initialOrderId?: string;
  initialAccess?: string;
}) {
  const [orderId, setOrderId] = useState(initialOrderId);
  const [access, setAccess] = useState(initialAccess);
  const [order, setOrder] = useState<OrderLookupView | null>(null);
  const [downloads, setDownloads] = useState<DownloadGrantView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setOrder(null);
    try {
      const result = await lookupOrderWithAccess(orderId, access);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOrder(result.order);
      setDownloads(result.downloads);
    } catch {
      setError("Could not look up this order. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          <span className="text-zinc-700">Order ID</span>
          <input
            required
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-700">Access code</span>
          <input
            required
            value={access}
            onChange={(event) => setAccess(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            placeholder="Paste the code from your confirmation email"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Checking…" : "View order"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {order ? (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Order {order.orderNumber}</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {order.paymentStatus.toLowerCase()} · {order.status.toLowerCase()}
          </p>
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between py-2">
                <span>{item.name} × {item.quantity}</span>
                <span>{item.lineTotal.toFixed(2)} {order.currency}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {order && downloads.length > 0 ? (
        <DownloadGrants orderId={orderId} access={access} grants={downloads} />
      ) : null}
    </div>
  );
}
