"use client";

import { useState, useTransition } from "react";
import { createFeaturedPlacement, updateFeaturedPlacement, type ActionResult } from "./actions";

export interface FeaturedPlacementFormProps {
  placement: {
    id?: string;
    type: string;
    slug: string;
    label: string;
    description: string | null;
    priceMonthly: number;
    priceQuarterly: number | null;
    priceAnnually: number | null;
    currency: string;
    maxSlots: number;
    categoryId: string | null;
    regionId: string | null;
    startsAt: string | null;
    endsAt: string | null;
    status: string;
  } | null;
  categories: { id: string; title: string; slug: string }[];
  regions: { id: string; stateFull: string; slug: string; state: string }[];
  types: { value: string; label: string }[];
  statuses: { value: string; label: string }[];
  submitLabel: string;
}

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";

export default function FeaturedPlacementForm({
  placement,
  categories,
  regions,
  types,
  statuses,
  submitLabel,
}: FeaturedPlacementFormProps) {
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    type: placement?.type ?? "HOME_FEATURED",
    slug: placement?.slug ?? "",
    label: placement?.label ?? "",
    description: placement?.description ?? "",
    priceMonthly: placement?.priceMonthly ?? 0,
    priceQuarterly: placement?.priceQuarterly ?? "",
    priceAnnually: placement?.priceAnnually ?? "",
    currency: placement?.currency ?? "USD",
    maxSlots: placement?.maxSlots ?? 1,
    categoryId: placement?.categoryId ?? "",
    regionId: placement?.regionId ?? "",
    startsAt: placement?.startsAt ? new Date(placement.startsAt).toISOString().slice(0, 16) : "",
    endsAt: placement?.endsAt ? new Date(placement.endsAt).toISOString().slice(0, 16) : "",
    status: placement?.status ?? "AVAILABLE",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value ? Number(value) : 0) : value,
    }));
  };

  const action = placement?.id
    ? updateFeaturedPlacement.bind(null, placement.id)
    : createFeaturedPlacement;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    startTransition(async () => {
      const res = await action(formData);
      setMessage(res);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Saved." : message.error}
        </p>
      )}

      {/* Type & Slug */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900">Placement Type & Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Type *</label>
            <select name="type" value={formData.type} onChange={handleChange} className={inputCls} required>
              {types.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Slug * (lowercase, hyphens)</label>
            <input name="slug" required value={formData.slug} onChange={handleChange} className={inputCls} placeholder="e.g. home-hero" />
          </div>
          <div>
            <label className={labelCls}>Label *</label>
            <input name="label" required value={formData.label} onChange={handleChange} className={inputCls} placeholder="e.g. Homepage Hero" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className={inputCls} placeholder="Internal description of this placement..." />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900">Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Monthly Price *</label>
            <input name="priceMonthly" type="number" step="0.01" min="0" required value={formData.priceMonthly} onChange={handleChange} className={inputCls} placeholder="79.00" />
          </div>
          <div>
            <label className={labelCls}>Quarterly Price</label>
            <input name="priceQuarterly" type="number" step="0.01" min="0" value={formData.priceQuarterly} onChange={handleChange} className={inputCls} placeholder="219.00" />
          </div>
          <div>
            <label className={labelCls}>Annual Price</label>
            <input name="priceAnnually" type="number" step="0.01" min="0" value={formData.priceAnnually} onChange={handleChange} className={inputCls} placeholder="899.00" />
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <input name="currency" value={formData.currency} onChange={handleChange} className={inputCls} maxlength="3" />
          </div>
          <div>
            <label className={labelCls}>Max Slots</label>
            <input name="maxSlots" type="number" min="1" required value={formData.maxSlots} onChange={handleChange} className={inputCls} />
          </div>
        </div>
      </section>

      {/* Targeting */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900">Targeting (Optional)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Category</label>
            <select name="categoryId" value={formData.categoryId} onChange={handleChange} className={inputCls}>
              <option value="">Global (all categories)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">Limit to a specific category. Leave empty for global placement.</p>
          </div>
          <div>
            <label className={labelCls}>Region</label>
            <select name="regionId" value={formData.regionId} onChange={handleChange} className={inputCls}>
              <option value="">Global (all regions)</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.stateFull} {r.city ? `– ${r.city}` : ""}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">Limit to a specific region. Leave empty for global placement.</p>
          </div>
        </div>
      </section>

      {/* Scheduling */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900">Scheduling</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Starts At</label>
            <input name="startsAt" type="datetime-local" value={formData.startsAt} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ends At</label>
            <input name="endsAt" type="datetime-local" value={formData.endsAt} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className={inputCls} required>
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="w-full sm:w-auto rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}