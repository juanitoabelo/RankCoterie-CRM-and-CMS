"use client";

import { useEffect, useState, useActionState } from "react";
import ApplyRegionPicker from "./ApplyRegionPicker";
import {
  applyListingWithState,
  getApplyFormOptions,
  type ApplyFormOptions,
} from "@/app/(site)/apply/actions";

type ApplyListingFormProps = {
  heading?: string;
  subheading?: string;
  showHeading?: boolean;
  submitLabel?: string;
  /** Pre-fetched options (server components) — avoids a client round-trip. */
  initialOptions?: ApplyFormOptions;
};

const FALLBACK_OPTIONS: ApplyFormOptions = {
  categories: [],
  regions: [],
  configured: false,
  payment: {
    standardLabel: "Standard",
    standardAmount: "97",
    premiumLabel: "Premium",
    premiumAmount: "197",
  },
};

export default function ApplyListingForm({
  heading = "Apply to get listed",
  subheading = "Get your program listed in the directory with a local SEO page per region. Pay a one-time setup fee plus a monthly subscription after review.",
  showHeading = true,
  submitLabel = "Continue to payment",
  initialOptions,
}: ApplyListingFormProps) {
  const [options, setOptions] = useState<ApplyFormOptions | null>(initialOptions ?? null);
  const [state, formAction, pending] = useActionState(applyListingWithState, null);
  const [tier, setTier] = useState<string>("STANDARD");

  useEffect(() => {
    if (initialOptions) return;
    let cancelled = false;
    getApplyFormOptions()
      .then((o) => {
        if (!cancelled) setOptions(o);
      })
      .catch(() => {
        if (!cancelled) setOptions(FALLBACK_OPTIONS);
      });
    return () => {
      cancelled = true;
    };
  }, [initialOptions]);

  const tierCard =
    "rounded-xl border bg-white p-5 text-left transition cursor-pointer";
  const fieldCls =
    "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
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

  const { categories, regions, configured, payment } = options;

  return (
    <div>
      {showHeading && (
        <>
          <h1 className="text-3xl font-semibold text-zinc-900">{heading}</h1>
          <p className="mt-3 text-zinc-600">{subheading}</p>
        </>
      )}

      {!configured && (
        <p className={`${showHeading ? "mt-4" : ""} rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800`}>
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
                Listed in category and region pages for your areas.
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
                Featured placement at the top plus a dedicated landing page.
              </p>
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Program title *</label>
            <input
              name="title"
              required
              className={fieldCls}
              placeholder="e.g. Clearview Horizon"
            />
          </div>
          <div>
            <label className={labelCls}>Company name</label>
            <input name="companyName" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Contact email *</label>
            <input
              name="email"
              type="email"
              required
              className={fieldCls}
            />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input name="phone" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <input name="website" type="url" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Address</label>
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
          <label className={labelCls}>Program summary</label>
          <textarea
            name="summary"
            rows={4}
            className={`${fieldCls} resize-y`}
            placeholder="Briefly describe the program, who it serves, and what makes it a good fit."
          />
        </div>

        <div>
          <h2 className="text-sm font-medium text-zinc-900">Categories *</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Pick at least one category your program belongs to.
          </p>
          <div className="mt-3 grid gap-1.5 rounded-xl border border-zinc-200 p-3 sm:grid-cols-2">
            {categories.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={c.id}
                  className="h-4 w-4 accent-zinc-900"
                />
                {c.title}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-zinc-900">Regions served *</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Select 3–5 nearby areas for best results.
          </p>
          <div className="mt-3">
            <ApplyRegionPicker regions={regions} />
          </div>
        </div>

        <button
          type="submit"
          disabled={!configured || pending}
          className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Submitting…" : submitLabel}
        </button>
      </form>
    </div>
  );
}
