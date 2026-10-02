"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refundOrder } from "@/app/(admin)/admin/orders/actions";

export default function RefundButton({
  orderId,
  canRefund,
}: {
  orderId: string;
  canRefund: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!canRefund) return null;

  const onRefund = () => {
    if (!window.confirm("Refund the full amount at the gateway and mark this order REFUNDED?")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await refundOrder(orderId);
      if (result.ok) {
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
        Issues a full refund via the original payment method, marks the order REFUNDED, and
        returns stock to inventory.
      </p>
      <button
        type="button"
        onClick={onRefund}
        disabled={isPending}
        className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
      >
        {isPending ? "Refunding…" : "Refund order"}
      </button>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
