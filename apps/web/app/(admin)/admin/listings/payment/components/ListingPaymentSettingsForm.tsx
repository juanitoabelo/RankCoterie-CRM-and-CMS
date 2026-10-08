"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ListingPaymentSettings } from "../types";
import { saveListingPaymentSettings } from "../actions";

export default function ListingPaymentSettingsForm({ settings }: { settings: ListingPaymentSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const set = <K extends keyof ListingPaymentSettings>(key: K, value: ListingPaymentSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("secretKey", form.secretKey);
    fd.set("publishableKey", form.publishableKey);
    fd.set("webhookSecret", form.webhookSecret);
    fd.set("standardPriceId", form.standardPriceId);
    fd.set("premiumPriceId", form.premiumPriceId);
    fd.set("freePriceId", form.freePriceId);
    fd.set("customPriceId", form.customPriceId);
    fd.set("setupFeeId", form.setupFeeId);
    fd.set("standardLabel", form.standardLabel);
    fd.set("standardAmount", form.standardAmount);
    fd.set("premiumLabel", form.premiumLabel);
    fd.set("premiumAmount", form.premiumAmount);
    fd.set("freeGraceDays", String(form.freeGraceDays));

    const result = await saveListingPaymentSettings(fd);
    setSaving(false);
    if (result.ok) {
      setMessage({ type: "ok", text: "Settings saved." });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.error });
    }
  }

  const labelCls = "block text-sm font-medium text-zinc-700";
  const inputCls =
    "mt-1 block w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";
  const hintCls = "mt-1 text-xs text-zinc-400";

  return (
    <div className="space-y-0">
      <div className="rounded-t-lg border border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Stripe Credentials</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Stripe Secret Key</label>
            <input
              type="password"
              className={inputCls}
              value={form.secretKey}
              onChange={(e) => set("secretKey", e.target.value)}
            />
            <p className={hintCls}>sk_live_… or sk_test_… — used for Checkout Sessions and subscription lookups.</p>
          </div>
          <div>
            <label className={labelCls}>Stripe Publishable Key</label>
            <input
              type="text"
              className={inputCls}
              value={form.publishableKey}
              onChange={(e) => set("publishableKey", e.target.value)}
            />
            <p className={hintCls}>pk_live_… or pk_test_… — safe to expose on the storefront.</p>
          </div>
          <div>
            <label className={labelCls}>Stripe Webhook Secret</label>
            <input
              type="password"
              className={inputCls}
              value={form.webhookSecret}
              onChange={(e) => set("webhookSecret", e.target.value)}
            />
            <p className={hintCls}>whsec_… from your webhook endpoint or `stripe listen`.</p>
          </div>
        </div>
      </div>

      <div className="border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Listing Price IDs</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Standard Tier Price ID</label>
            <input
              type="text"
              className={inputCls}
              value={form.standardPriceId}
              onChange={(e) => set("standardPriceId", e.target.value)}
            />
            <p className={hintCls}>Stripe price ID for paid listings in the STANDARD tier.</p>
          </div>
          <div>
            <label className={labelCls}>Premium Tier Price ID</label>
            <input
              type="text"
              className={inputCls}
              value={form.premiumPriceId}
              onChange={(e) => set("premiumPriceId", e.target.value)}
            />
            <p className={hintCls}>Stripe price ID for paid listings in the PREMIUM tier.</p>
          </div>
          <div>
            <label className={labelCls}>Free Tier Price ID</label>
            <input
              type="text"
              className={inputCls}
              value={form.freePriceId}
              onChange={(e) => set("freePriceId", e.target.value)}
            />
            <p className={hintCls}>Reserved for a future free/self-billed price type.</p>
          </div>
          <div>
            <label className={labelCls}>Custom Price ID</label>
            <input
              type="text"
              className={inputCls}
              value={form.customPriceId}
              onChange={(e) => set("customPriceId", e.target.value)}
            />
            <p className={hintCls}>Reserved for a future custom listing price type.</p>
          </div>
        </div>
      </div>

      <div className="border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-1 text-base font-semibold text-zinc-900">Checkout Options</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Setup fee applied to every listing checkout before the recurring tier price.
        </p>
        <div>
          <label className={labelCls}>Setup Fee Price ID</label>
          <input
            type="text"
            className={inputCls}
            value={form.setupFeeId}
            onChange={(e) => set("setupFeeId", e.target.value)}
          />
          <p className={hintCls}>One-time fee charged at checkout, e.g. price_1XXXXXXXXXXXXX.</p>
        </div>
      </div>

      <div className="border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-1 text-base font-semibold text-zinc-900">Tier Display</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Labels and monthly amounts shown on the public Apply page (/apply).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Standard tier label</label>
            <input
              type="text"
              className={inputCls}
              value={form.standardLabel}
              onChange={(e) => set("standardLabel", e.target.value)}
            />
            <p className={hintCls}>Shown on the apply form, e.g. "Standard".</p>
          </div>
          <div>
            <label className={labelCls}>Standard monthly amount</label>
            <input
              type="text"
              className={inputCls}
              value={form.standardAmount}
              onChange={(e) => set("standardAmount", e.target.value)}
            />
            <p className={hintCls}>Shown as "— $X/mo" on the apply form.</p>
          </div>
          <div>
            <label className={labelCls}>Premium tier label</label>
            <input
              type="text"
              className={inputCls}
              value={form.premiumLabel}
              onChange={(e) => set("premiumLabel", e.target.value)}
            />
            <p className={hintCls}>Shown on the apply form, e.g. "Premium".</p>
          </div>
          <div>
            <label className={labelCls}>Premium monthly amount</label>
            <input
              type="text"
              className={inputCls}
              value={form.premiumAmount}
              onChange={(e) => set("premiumAmount", e.target.value)}
            />
            <p className={hintCls}>Shown as "— $X/mo" on the apply form.</p>
          </div>
        </div>
      </div>

      <div className="rounded-b-lg border border-t-0 border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-1 text-base font-semibold text-zinc-900">Free Tier</h2>
        <p className="mb-4 text-sm text-zinc-500">
          FREE listings are only publicly visible for this grace period after an admin
          approves them, then automatically disappear from the directory until re-approved.
        </p>
        <div>
          <label className={labelCls}>Grace period (days)</label>
          <input
            type="number"
            min={0}
            max={3650}
            className={inputCls}
            value={form.freeGraceDays}
            onChange={(e) => set("freeGraceDays", e.target.value === "" ? 0 : Number(e.target.value))}
          />
          <p className={hintCls}>
            Days a FREE-tier listing stays live after approval. 0 = never show FREE
            listings publicly. Default 90.
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {message && (
          <span
            className={`text-sm ${
              message.type === "ok" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
