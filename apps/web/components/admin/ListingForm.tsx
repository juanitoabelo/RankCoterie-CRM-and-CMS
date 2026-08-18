"use client";

import { useState, useTransition } from "react";
import RegionPicker, { type PickerRegion } from "@/components/regions/RegionPicker";
import { createListing, updateListing, type ActionResult } from "@/app/(admin)/admin/listings/actions";

export interface ListingFormCategory {
  id: string;
  slug: string;
  title: string;
}

export interface ListingFormListing {
  id: string;
  title: string;
  slug: string;
  domainKey: string | null;
  tier: string;
  status: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  summary: string | null;
  isLandingPage: boolean;
  categoryIds: string[];
  regionIds: string[];
}

const TIERS = ["SUPPRESSED", "FREE", "STANDARD", "PREMIUM"];
const STATUSES = ["DRAFT", "PENDING_REVIEW", "LIVE", "SUSPENDED", "EXPIRED"];

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";

export default function ListingForm({
  listing,
  categories,
  regions,
  submitLabel,
}: {
  listing: ListingFormListing | null;
  categories: ListingFormCategory[];
  regions: PickerRegion[];
  submitLabel: string;
}) {
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    listing?.categoryIds ?? [],
  );
  const [selectedRegions, setSelectedRegions] = useState<string[]>(listing?.regionIds ?? []);

  const action = listing
    ? updateListing.bind(null, listing.id)
    : createListing;

  const onSubmit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const res = await action(formData);
      setMessage(res);
    });
  };

  return (
    <form action={onSubmit} className="space-y-8">
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Saved." : message.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Title *</label>
          <input name="title" required defaultValue={listing?.title ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Slug * (lowercase, hyphens)</label>
          <input name="slug" required defaultValue={listing?.slug ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Domain key</label>
          <input name="domainKey" defaultValue={listing?.domainKey ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Company name</label>
          <input name="companyName" defaultValue={listing?.companyName ?? ""} className={inputCls} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Tier</label>
          <select name="tier" defaultValue={listing?.tier ?? "FREE"} className={inputCls}>
            {TIERS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select name="status" defaultValue={listing?.status ?? "DRAFT"} className={inputCls}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="isLandingPage"
              defaultChecked={listing?.isLandingPage ?? false}
              className="h-4 w-4 accent-zinc-900"
            />
            Landing page listing
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Phone</label>
          <input name="phone" defaultValue={listing?.phone ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input name="email" type="email" defaultValue={listing?.email ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Website</label>
          <input name="website" type="url" defaultValue={listing?.website ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Summary</label>
          <textarea name="summary" rows={3} defaultValue={listing?.summary ?? ""} className={inputCls} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>City</label>
          <input name="city" defaultValue={listing?.city ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>State</label>
          <input name="state" defaultValue={listing?.state ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>ZIP</label>
          <input name="zip" defaultValue={listing?.zip ?? ""} className={inputCls} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-900">Categories *</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="categoryIds"
                value={c.id}
                checked={selectedCategories.includes(c.id)}
                onChange={(e) =>
                  setSelectedCategories((prev) =>
                    e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                  )
                }
                className="h-4 w-4 accent-zinc-900"
              />
              {c.title}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-900">Nearby areas (3–5)</h3>
        <p className="mt-1 text-xs text-zinc-500">
          These regions appear in the listing's area coverage — same picker as the
          legacy Nearby-Areas field.
        </p>
        {selectedRegions.map((id) => (
          <input key={id} type="hidden" name="regionIds" value={id} />
        ))}
        <div className="mt-3">
          <RegionPicker
            regions={regions}
            value={selectedRegions}
            onChange={setSelectedRegions}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}