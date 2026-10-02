"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFulfillment } from "@/app/(admin)/admin/orders/actions";

export type FulfillmentInfo = {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: string;
};

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-700";

export default function FulfillmentForm({
  orderId,
  initial,
}: {
  orderId: string;
  initial: FulfillmentInfo;
}) {
  const [message, setMessage] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveFulfillment(orderId, formData);
      if (result.ok) {
        setMessage({ ok: true });
        router.refresh();
      } else {
        setMessage({ ok: false, error: result.error });
      }
    });
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Fulfillment</h2>
      {initial.shippedAt && (
        <p className="mt-1 text-xs text-zinc-400">
          Shipped {new Date(initial.shippedAt).toLocaleString()}
        </p>
      )}
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <div>
          <label className={labelCls} htmlFor="carrier">
            Carrier
          </label>
          <input
            id="carrier"
            name="carrier"
            type="text"
            defaultValue={initial.carrier ?? ""}
            placeholder="USPS, FedEx, DHL…"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="trackingNumber">
            Tracking number <span className="text-red-500">*</span>
          </label>
          <input
            id="trackingNumber"
            name="trackingNumber"
            type="text"
            required
            defaultValue={initial.trackingNumber ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="trackingUrl">
            Tracking URL (optional)
          </label>
          <input
            id="trackingUrl"
            name="trackingUrl"
            type="url"
            defaultValue={initial.trackingUrl ?? ""}
            placeholder="https://…"
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save fulfillment"}
        </button>
        {message && (
          <p className={`text-xs ${message.ok ? "text-emerald-600" : "text-red-600"}`}>
            {message.ok ? "Fulfillment saved." : message.error}
          </p>
        )}
      </form>
    </div>
  );
}
