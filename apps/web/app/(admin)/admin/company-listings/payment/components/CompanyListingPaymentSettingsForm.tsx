"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanyListingPaymentSettings } from "../types";
import { saveCompanyListingPaymentSettings } from "../actions";

export default function CompanyListingPaymentSettingsForm({
  settings,
}: {
  settings: CompanyListingPaymentSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const set = <K extends keyof CompanyListingPaymentSettings>(
    key: K,
    value: CompanyListingPaymentSettings[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("secretKey", form.secretKey);
    fd.set("publishableKey", form.publishableKey);
    fd.set("webhookSecret", form.webhookSecret);
    fd.set("standardPriceId", form.standardPriceId);
    fd.set("premiumPriceId", form.premiumPriceId);
    fd.set("setupFeeId", form.setupFeeId);
    fd.set("setupFeeAmount", form.setupFeeAmount);
    fd.set("standardLabel", form.standardLabel);
    fd.set("standardAmount", form.standardAmount);
    fd.set("premiumLabel", form.premiumLabel);
    fd.set("premiumAmount", form.premiumAmount);

    const result = await saveCompanyListingPaymentSettings(fd);
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
            <p className={hintCls}>
              sk_live_… or sk_test_… — used for company page Checkout Sessions. Leave blank to
              inherit the directory/environment key.
            </p>
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
            <p className={hintCls}>whsec_… — must match the endpoint receiving company payments.</p>
          </div>
        </div>
      </div>

      <div className="border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Tier Price IDs</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Standard Tier Price ID</label>
            <input
              type="text"
              className={inputCls}
              value={form.standardPriceId}
              onChange={(e) => set("standardPriceId", e.target.value)}
            />
            <p className={hintCls}>Recurring monthly Stripe price for company pages in STANDARD.</p>
          </div>
          <div>
            <label className={labelCls}>Premium Tier Price ID</label>
            <input
              type="text"
              className={inputCls}
              value={form.premiumPriceId}
              onChange={(e) => set("premiumPriceId", e.target.value)}
            />
            <p className={hintCls}>Recurring monthly Stripe price for company pages in PREMIUM.</p>
          </div>
        </div>
      </div>

      <div className="border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-1 text-base font-semibold text-zinc-900">One-Time Setup Fee</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Charged once with the first tier payment when a company owner applies online. Also the
          default amount for invoices an admin sends to finalize a manually added page.
        </p>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Setup Fee Price ID</label>
            <input
              type="text"
              className={inputCls}
              value={form.setupFeeId}
              onChange={(e) => set("setupFeeId", e.target.value)}
            />
            <p className={hintCls}>One-time Stripe price, e.g. price_1XXXXXXXXXXXXX.</p>
          </div>
          <div>
            <label className={labelCls}>Setup fee amount (default for invoices)</label>
            <input
              type="text"
              className={inputCls}
              value={form.setupFeeAmount}
              onChange={(e) => set("setupFeeAmount", e.target.value)}
              placeholder="e.g. 497"
            />
            <p className={hintCls}>
              Displayed/prefilled when generating a payment link invoice — no cents needed.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-b-lg border border-t-0 border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-1 text-base font-semibold text-zinc-900">Tier Display</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Labels and monthly amounts shown on the public Company Listing apply page
          (/apply/company).
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
          </div>
          <div>
            <label className={labelCls}>Standard monthly amount</label>
            <input
              type="text"
              className={inputCls}
              value={form.standardAmount}
              onChange={(e) => set("standardAmount", e.target.value)}
            />
            <p className={hintCls}>Shown as &ldquo;$X/mo&rdquo; on the apply form.</p>
          </div>
          <div>
            <label className={labelCls}>Premium tier label</label>
            <input
              type="text"
              className={inputCls}
              value={form.premiumLabel}
              onChange={(e) => set("premiumLabel", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Premium monthly amount</label>
            <input
              type="text"
              className={inputCls}
              value={form.premiumAmount}
              onChange={(e) => set("premiumAmount", e.target.value)}
            />
            <p className={hintCls}>Shown as &ldquo;$X/mo&rdquo; on the apply form.</p>
          </div>
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
            className={`text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
