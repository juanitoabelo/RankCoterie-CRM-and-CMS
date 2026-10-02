"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCoupon } from "@/app/(admin)/admin/coupons/actions";

export default function DeleteCouponButton({ id, code }: { id: string; code: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onDelete = () => {
    if (!window.confirm(`Delete coupon ${code}? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCoupon(id);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <span>
      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        className="text-sm font-medium text-zinc-400 hover:text-red-600 disabled:opacity-50"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="ml-2 block text-xs text-red-600">{error}</span>}
    </span>
  );
}
