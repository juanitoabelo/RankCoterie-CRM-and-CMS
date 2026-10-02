"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refundOrder } from "@/app/(admin)/admin/orders/actions";

export default function RefundButton({
  orderId,
  canRefund,
  total,
  refundedAmount,
}: {
  orderId: string;
  canRefund: boolean;
  total: number;
  refundedAmount: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const remaining = Math.round((total - refundedAmount) * 100) / 100;
  if (!canRefund || remaining <= 0) return null;

  const onRefund = () => {
    const raw = amount.trim();
    const parsed = raw === "" ? remaining : Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a refund amount greater than zero.");
      return;
    }
    const isFull = Math.abs(parsed - remaining) < 0.01;
    const verb = isFull
      ? "Refund the full remaining amount"
      : `Refund $${parsed.toFixed(2)}`;
    if (
      !window.confirm(
        `${verb} via the original payment method${isFull ? " and mark this order REFUNDED" : ""}?`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await refundOrder(orderId, parsed, reason.trim() || null);
      if (result.ok) {
        setAmount("");
        setReason("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-red-700">Refund</h2>
      <p className="mt-1 text-xs text-red-600">
        {refundedAmount > 0 && (
          <>
            <strong>${refundedAmount.toFixed(2)}</strong> already refunded ·{" "}
          </>
        )}
        Remaining ${remaining.toFixed(2)}. Partial refunds keep the order open; a full refund
        marks it REFUNDED and returns stock to inventory.
      </p>
      <div className="mt-3 grid gap-2">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`refund-amount-${orderId}`}>
            Refund amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
              $
            </span>
            <input
              id={`refund-amount-${orderId}`}
              type="number"
              min="0.01"
              step="0.01"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={remaining.toFixed(2)}
              className="w-36 rounded-lg border border-red-300 bg-white py-2 pl-6 pr-3 text-sm tabular-nums"
            />
          </div>
          <button
            type="button"
            onClick={onRefund}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? "Refunding…" : "Refund order"}
          </button>
        </div>
        <div>
          <label className="sr-only" htmlFor={`refund-reason-${orderId}`}>
            Refund reason
          </label>
          <input
            id={`refund-reason-${orderId}`}
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional, internal)"
            className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
