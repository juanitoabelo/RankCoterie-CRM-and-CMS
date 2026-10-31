"use client";

import { useEffect, useState, useActionState } from "react";
import {
  applyCompanyWithState,
  getCompanyApplyFormOptions,
  type CompanyApplyFormOptions,
} from "@/app/(site)/apply/company/actions";

const FALLBACK: CompanyApplyFormOptions = {
  configured: false,
  setupFeeAmount: "",
  payment: {
    standardLabel: "Standard",
    standardAmount: "97",
    premiumLabel: "Premium",
    premiumAmount: "197",
  },
};

export default function ApplyCompanyForm({
  initialOptions,
}: {
  initialOptions?: CompanyApplyFormOptions;
}) {
  const [options, setOptions] = useState<CompanyApplyFormOptions | null>(initialOptions ?? null);
  const [state, formAction, pending] = useActionState(applyCompanyWithState, null);
  const [tier, setTier] = useState<string>("STANDARD");

  useEffect(() => {
    if (initialOptions) return;
    let cancelled = false;
    getCompanyApplyFormOptions()
      .then((o) => {
        if (!cancelled) setOptions(o);
      })
      .catch(() => {
        if (!cancelled) setOptions(FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, [initialOptions]);

  const tierCard = "rounded-xl border bg-white p-5 text-left transition cursor-pointer";
  const fieldCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
  const labelCls = "block text-sm font-medium text-zinc-800";

  if (!options) {
    return (
      <div className="animate-pulse space-y-4" aria-busy="true">
        <div className="h-8 w-2/3 rounded bg-zinc-200" />
        <div className="h-4 w-full rounded bg-zinc-100" />
        <div className="h-64 rounded-xl bg-zinc-100" />
      </div>
    );
  }

  const { configured, setupFeeAmount, payment } = options;

  return (
    <div>
      <h1 className="text-3xl font-semibold text-zinc-900">Get your company page</h1>
      <p className="mt-3 text-zinc-600">
        A dedicated landing page for your business. Pay a one-time setup fee plus a
        monthly tier subscription — your page goes live as soon as payment completes.
      </p>

      {!configured && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Applications are temporarily paused while payments are being configured.
        </p>
      )}

      {state?.ok === false && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <form action={formAction} className="mt-8 space-y-8">
        <div>
          <h2 className="text-sm font-medium text-zinc-900">Choose your tier</h2>
          {setupFeeAmount && (
            <p className="mt-1 text-sm text-zinc-500">
              One-time setup fee: ${setupFeeAmount} (charged with your first payment).
            </p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label
              className={`${tierCard} relative ${
                tier === "STANDARD"
                  ? "border-zinc-900 ring-2 ring-zinc-900"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <input
                type="radio"
                name="tier"
                value="STANDARD"
                required
                checked={tier === "STANDARD"}
                onChange={() => setTier("STANDARD")}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                  tier === "STANDARD"
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 text-transparent"
                }`}
              >
                ✓
              </span>
              <p className="pr-8 font-semibold text-zinc-900">
                {payment.standardLabel} — ${payment.standardAmount}/mo
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                Your company page with contact form and details.
              </p>
            </label>
            <label
              className={`${tierCard} relative ${
                tier === "PREMIUM"
                  ? "border-zinc-900 ring-2 ring-zinc-900"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <input
                type="radio"
                name="tier"
                value="PREMIUM"
                required
                checked={tier === "PREMIUM"}
                onChange={() => setTier("PREMIUM")}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                  tier === "PREMIUM"
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 text-transparent"
                }`}
              >
                ✓
              </span>
              <p className="pr-8 font-semibold text-zinc-900">
                {payment.premiumLabel} — ${payment.premiumAmount}/mo
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                Featured placement plus premium page template.
              </p>
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Company name *</label>
            <input name="title" required className={fieldCls} placeholder="e.g. Acme Roofing" />
          </div>
          <div>
            <label className={labelCls}>Contact email *</label>
            <input name="email" type="email" required className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input name="phone" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <input name="website" type="url" className={fieldCls} placeholder="https://…" />
          </div>
          <div>
            <label className={labelCls}>Street</label>
            <input name="address" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>City</label>
            <input name="city" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>State</label>
            <input name="state" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>ZIP code</label>
            <input name="zip" className={fieldCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Short summary</label>
          <textarea
            name="summary"
            rows={3}
            className={`${fieldCls} resize-y`}
            placeholder="What does your company do, and who does it serve?"
          />
        </div>

        <div>
          <h2 className="text-sm font-medium text-zinc-900">Create your login</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Pick a username. You can sign in with either this username or your
            contact email above to manage your page and invoices from your company
            portal after checkout.
          </p>
          <div className="mt-3">
            <label className={labelCls}>
              Username *
              <input
                name="username"
                required
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9]"
                autoComplete="username"
                className={fieldCls}
                placeholder="e.g. acme-roofing"
              />
            </label>
            <p className="mt-1 text-xs text-zinc-500">
              Letters, numbers, dots, underscores, and hyphens. This is your login
              handle, separate from your name and email.
            </p>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              Password *
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={fieldCls}
              />
            </label>
            <label className={labelCls}>
              Confirm password *
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={fieldCls}
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={!configured || pending}
          className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Submitting…" : "Continue to payment"}
        </button>
      </form>
    </div>
  );
}
