"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyCouponToCart, removeCouponFromCart } from "@/app/(site)/checkout/actions";

export default function CouponBox({
  couponCode,
  couponError,
}: {
  couponCode: string | null;
  couponError?: string | null;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(couponError ?? null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const apply = () => {
    if (!code.trim()) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("code", code.trim());
      const result = await applyCouponToCart(fd);
      if (result.ok) {
        setCode("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeCouponFromCart();
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="mt-4">
      {couponCode ? (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <span className="text-sm font-medium text-emerald-800">
            Coupon <span className="font-mono">{couponCode}</span> applied
          </span>
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="text-xs font-medium text-emerald-700 underline hover:text-emerald-900 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
            }}
            placeholder="Coupon code"
            aria-label="Coupon code"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm uppercase placeholder:normal-case placeholder:text-zinc-400"
          />
          <button
            type="button"
            onClick={apply}
            disabled={isPending || !code.trim()}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {isPending ? "…" : "Apply"}
          </button>
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
