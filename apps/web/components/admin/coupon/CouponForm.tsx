"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCoupon, updateCoupon } from "@/app/(admin)/admin/coupons/actions";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";

export type CouponInitial = {
  id?: string;
  code: string;
  type: string;
  amount: number;
  description: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  usageLimit: number | null;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
};

function toDateInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CouponForm({ initial }: { initial?: CouponInitial }) {
  const isEdit = Boolean(initial?.id);
  const [message, setMessage] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateCoupon(initial!.id!, formData)
          : await createCoupon(formData);
        if (result.ok) {
          setMessage({ ok: true });
          router.refresh();
          if (!isEdit) router.push("/admin/coupons");
        } else {
          setMessage({ ok: false, error: result.error });
        }
      } catch (err) {
        setMessage({ ok: false, error: err instanceof Error ? err.message : "Failed to save coupon." });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {isEdit ? "Edit Coupon" : "Add Coupon"}
      </h2>

      {message && (
        <p className={`mt-3 text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Coupon saved." : message.error}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="coupon-code">
            Code <span className="text-red-500">*</span>
          </label>
          <input
            id="coupon-code"
            type="text"
            name="code"
            required
            defaultValue={initial?.code ?? ""}
            className={`${inputCls} font-mono uppercase`}
            placeholder="e.g. SAVE10"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="coupon-type">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            id="coupon-type"
            name="type"
            defaultValue={initial?.type ?? "PERCENT"}
            className={inputCls}
          >
            <option value="PERCENT">Percentage (%)</option>
            <option value="FIXED_CART">Fixed amount off cart ($)</option>
            <option value="FIXED_PRODUCT">Fixed amount per product ($)</option>
            <option value="FREE_SHIPPING">Free shipping</option>
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="coupon-amount">
            Amount <span className="text-red-500">*</span>
          </label>
          <input
            id="coupon-amount"
            type="number"
            name="amount"
            step="0.01"
            min="0"
            required
            defaultValue={initial?.amount ?? 0}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="coupon-min">Minimum spend ($)</label>
          <input
            id="coupon-min"
            type="number"
            name="minAmount"
            step="0.01"
            min="0"
            defaultValue={initial?.minAmount ?? ""}
            className={inputCls}
            placeholder="Optional"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="coupon-max">Maximum discount ($)</label>
          <input
            id="coupon-max"
            type="number"
            name="maxAmount"
            step="0.01"
            min="0"
            defaultValue={initial?.maxAmount ?? ""}
            className={inputCls}
            placeholder="Optional"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="coupon-usage">Usage limit (total)</label>
          <input
            id="coupon-usage"
            type="number"
            name="usageLimit"
            min="1"
            defaultValue={initial?.usageLimit ?? ""}
            className={inputCls}
            placeholder="Unlimited"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="coupon-desc">Description</label>
          <input
            id="coupon-desc"
            type="text"
            name="description"
            defaultValue={initial?.description ?? ""}
            className={inputCls}
            placeholder="Internal note"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="coupon-start">Start date</label>
          <input
            id="coupon-start"
            type="date"
            name="startDate"
            defaultValue={toDateInput(initial?.startDate ?? null)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="coupon-end">End date</label>
          <input
            id="coupon-end"
            type="date"
            name="endDate"
            defaultValue={toDateInput(initial?.endDate ?? null)}
            className={inputCls}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700 sm:col-span-2">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={initial?.isActive ?? true}
            className="h-4 w-4 rounded border-zinc-400"
          />
          Active
        </label>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        Product/category targeting uses the coupon API fields (productIds, categoryIds) —
        defaults apply the coupon to the whole cart.
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {isPending ? "Saving…" : isEdit ? "Save Coupon" : "Create Coupon"}
      </button>
    </form>
  );
}
