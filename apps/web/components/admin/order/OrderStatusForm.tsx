"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus, updatePaymentStatus } from "@/app/(admin)/admin/orders/actions";

const ORDER_STATUSES = ["PENDING", "PROCESSING", "ON_HOLD", "COMPLETED", "CANCELLED", "REFUNDED", "FAILED"];
const PAYMENT_STATUSES = ["PENDING", "AUTHORIZED", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED"];

export default function OrderStatusForm({
  orderId,
  status,
  paymentStatus,
}: {
  orderId: string;
  status: string;
  paymentStatus: string;
}) {
  const [message, setMessage] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await fn();
        if (result.ok) {
          setMessage({ ok: true });
          router.refresh();
        } else {
          setMessage({ ok: false, error: result.error });
        }
      } catch (e) {
        setMessage({ ok: false, error: e instanceof Error ? e.message : "Update failed." });
      }
    });
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Status</h2>

      {message && (
        <p className={`mt-3 text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}>
          {message.ok ? "Order updated." : message.error}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-zinc-600" htmlFor="order-status">
            Order status
          </label>
          <select
            id="order-status"
            value={status}
            disabled={isPending}
            onChange={(e) => run(() => updateOrderStatus(orderId, e.target.value))}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600" htmlFor="payment-status">
            Payment status
          </label>
          <select
            id="payment-status"
            value={paymentStatus}
            disabled={isPending}
            onChange={(e) => run(() => updatePaymentStatus(orderId, e.target.value))}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-400">
        Changes are saved immediately and written to the audit log.
      </p>
    </div>
  );
}
