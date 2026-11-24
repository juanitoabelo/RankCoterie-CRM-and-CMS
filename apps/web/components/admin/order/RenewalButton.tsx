"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRenewalOrder } from "@/app/(admin)/admin/orders/actions";

export default function RenewalButton({
  subscriptionId,
  disabled,
}: {
  subscriptionId: string;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (disabled) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Renewal</h2>
      <p className="mt-2 text-xs text-zinc-500">
        Create a manual renewal order for this subscription. The order will be marked paid through the normal payment flow.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm("Create a renewal order for this subscription?")) return;
          setError(null);
          startTransition(async () => {
            const result = await createRenewalOrder(subscriptionId);
            if (result.ok && result.orderId) {
              router.push(`/admin/orders/${result.orderId}`);
              router.refresh();
            } else {
              setError(result.ok ? "Renewal order created." : result.error);
            }
          });
        }}
        className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Create renewal order"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
