"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTaxRate, updateTaxRate } from "@/app/(admin)/admin/tax/actions";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";

export type TaxRateInitial = {
  id: string;
  name: string | null;
  country: string;
  state: string | null;
  rate: number;
  priority: number;
};

export default function TaxRateForm({ initial }: { initial?: TaxRateInitial }) {
  const isEdit = Boolean(initial?.id);
  const [message, setMessage] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateTaxRate(initial!.id, formData)
          : await createTaxRate(formData);
        if (result.ok) {
          setMessage({ ok: true });
          router.refresh();
          if (!isEdit) form.reset();
        } else {
          setMessage({ ok: false, error: result.error });
        }
      } catch (err) {
        setMessage({ ok: false, error: err instanceof Error ? err.message : "Failed to save tax rate." });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {isEdit ? "Edit Tax Rate" : "Add Tax Rate"}
      </h2>

      {message && (
        <p className={`mt-3 text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Tax rate saved." : message.error}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="tax-name">Name</label>
          <input
            id="tax-name"
            type="text"
            name="name"
            defaultValue={initial?.name ?? ""}
            className={inputCls}
            placeholder="e.g. CA sales tax"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="tax-country">
            Country <span className="text-red-500">*</span>
          </label>
          <input
            id="tax-country"
            type="text"
            name="country"
            required
            defaultValue={initial?.country ?? ""}
            className={inputCls}
            placeholder="e.g. US"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="tax-state">State / Region</label>
          <input
            id="tax-state"
            type="text"
            name="state"
            defaultValue={initial?.state ?? ""}
            className={inputCls}
            placeholder="Blank = whole country"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="tax-rate">
            Rate (%) <span className="text-red-500">*</span>
          </label>
          <input
            id="tax-rate"
            type="number"
            name="rate"
            step="0.0001"
            min="0"
            required
            defaultValue={initial?.rate ?? ""}
            className={inputCls}
            placeholder="e.g. 8.25"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="tax-priority">Priority</label>
          <input
            id="tax-priority"
            type="number"
            name="priority"
            step="1"
            defaultValue={initial?.priority ?? 0}
            className={inputCls}
            placeholder="Higher wins"
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        Matching is case-insensitive. A state-specific rate beats a country-wide one at the
        same priority. Tax applies to the discounted subtotal.
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {isPending ? "Saving…" : isEdit ? "Save Tax Rate" : "Create Tax Rate"}
      </button>
    </form>
  );
}
