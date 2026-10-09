"use client";

import { useState, useTransition } from "react";
import RegionPicker from "@/components/regions/RegionPicker";
import {
  createListing,
  updateListing,
  updateMyListing,
  checkDuplicateListing,
  previewListing,
  type ActionResult,
  type DuplicateCheckResult,
  type PreviewListingResult,
} from "@/app/(admin)/admin/listings/actions";
import ImageUploader from "@/components/admin/ImageUploader";
import RichTextarea from "@/components/admin/RichTextarea";
import GalleryImagesUploader from "@/components/admin/GalleryImagesUploader";

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
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  summary: string | null;
  description: string | null;
  isLandingPage: boolean;
  categoryIds: string[];
  regionIds: string[];
  avatarImage: string | null;
  feedImage: string | null;
  galleryImages: string | null;
  videoUrl: string | null;
  hoursOfOperation: string | null;
  specialties: string | null;
  amenities: string | null;
  certifications: string | null;
  insuranceAccepted: string | null;
  pricing: string | null;
  seoTitle: string | null;
  metaDesc: string | null;
  focusKeyphrase: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
}

const TIERS = ["SUPPRESSED", "FREE", "STANDARD", "PREMIUM"];
const STATUSES = ["DRAFT", "PENDING_REVIEW", "LIVE", "SUSPENDED", "EXPIRED"];

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";

// ---------------------------------------------------------------------------
// Structured editors (replaces the raw-JSON textareas)
// ---------------------------------------------------------------------------

function parseJsonList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
  } catch {
    /* ignore */
  }
  return [];
}

type HoursMap = Record<string, { opens: string; closes: string }>;

const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function parseHours(value: string | null): HoursMap {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as HoursMap;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function HoursEditor({ value }: { value: string | null }) {
  const [hours, setHours] = useState<HoursMap>(() => parseHours(value));
  const [manuallyClosed, setManuallyClosed] = useState<Record<string, boolean>>(() => {
    const parsed = parseHours(value);
    const closed: Record<string, boolean> = {};
    for (const day of WEEK_DAYS) {
      const entry = parsed[day];
      closed[day] = !entry || (entry.opens === "00:00" && entry.closes === "00:00");
    }
    return closed;
  });

  const toggle = (day: string, open: boolean) => {
    setManuallyClosed((prev) => ({ ...prev, [day]: !open }));
    setHours((prev) => {
      const next = { ...prev };
      if (open) next[day] = prev[day] ?? { opens: "09:00", closes: "17:00" };
      else delete next[day];
      return next;
    });
  };

  const setTime = (day: string, key: "opens" | "closes", time: string) => {
    setHours((prev) => {
      const cur = prev[day] ?? { opens: "09:00", closes: "17:00" };
      return { ...prev, [day]: { ...cur, [key]: time } };
    });
  };

  return (
    <div>
      <input type="hidden" name="hoursOfOperation" value={JSON.stringify(hours)} />
      <div className="space-y-2">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="flex flex-wrap items-center gap-3">
            <label className="flex w-36 items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={!manuallyClosed[day]}
                onChange={(e) => toggle(day, e.target.checked)}
                className="h-4 w-4 accent-zinc-900"
              />
              {DAY_LABELS[day]}
            </label>
            {hours[day] ? (
              <>
                <input
                  type="time"
                  value={hours[day].opens ?? "09:00"}
                  onChange={(e) => setTime(day, "opens", e.target.value)}
                  className="rounded border border-zinc-300 px-2 py-1 text-sm"
                />
                <span className="text-sm text-zinc-400">to</span>
                <input
                  type="time"
                  value={hours[day].closes ?? "17:00"}
                  onChange={(e) => setTime(day, "closes", e.target.value)}
                  className="rounded border border-zinc-300 px-2 py-1 text-sm"
                />
              </>
            ) : (
              <span className="text-sm text-zinc-400">Closed</span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Check a day to add hours, uncheck to mark it closed.
      </p>
    </div>
  );
}

function ListEditor({ name, value, placeholder }: { name: string; value: string | null; placeholder?: string }) {
  const [items, setItems] = useState<string[]>(() => parseJsonList(value));
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <input
        type="text"
        value={items.join(", ")}
        onChange={(e) => {
          const parts = e.target.value.split(",").map((s) => s.trim());
          setItems(parts);
        }}
        placeholder={placeholder}
        className={inputCls}
      />
      <p className="mt-1 text-xs text-zinc-500">Separate items with commas.</p>
    </div>
  );
}

function parsePricing(value: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) out[k] = String(v);
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function PricingEditor({ value }: { value: string | null }) {
  const [rows, setRows] = useState<{ key: string; value: string }[]>(() => {
    const parsed = parsePricing(value);
    const entries = Object.entries(parsed);
    return entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : [{ key: "", value: "" }];
  });

  const setRow = (i: number, patch: Partial<{ key: string; value: string }>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const toObject = () => {
    const out: Record<string, number> = {};
    for (const row of rows) {
      const key = row.key.trim();
      if (key) out[key] = Number(row.value) || 0;
    }
    return out;
  };

  return (
    <div>
      <input type="hidden" name="pricing" value={JSON.stringify(toObject())} />
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={row.key}
              onChange={(e) => setRow(i, { key: e.target.value })}
              placeholder="e.g. Initial session"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              value={row.value}
              onChange={(e) => setRow(i, { value: e.target.value })}
              type="number"
              step="any"
              min="0"
              placeholder="$"
              className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, { key: "", value: "" }])}
        className="mt-2 rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
      >
        + Add pricing row
      </button>
      <p className="mt-1 text-xs text-zinc-500">
        Per-service pricing shown on your listing (e.g. session fees).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

export default function ListingForm({
  listing,
  categories,
  regions,
  submitLabel,
  ownerMode = false,
}: {
  listing: ListingFormListing | null;
  categories: { id: string; slug: string; title: string }[];
  regions: { id: string; state: string; stateFull: string; city: string | null }[];
  submitLabel: string;
  ownerMode?: boolean;
}) {
  const [message, setMessage] = useState<
    ActionResult | DuplicateCheckResult | PreviewListingResult | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    listing?.categoryIds ?? [],
  );
  const [selectedRegions, setSelectedRegions] = useState<string[]>(listing?.regionIds ?? []);

  const action = ownerMode
    ? updateMyListing.bind(null, listing?.id ?? "")
    : listing
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
          {message.ok
            ? "duplicates" in message
              ? message.duplicates.length > 0
                ? `${message.duplicates.length} potential duplicate(s) found.`
                : "No duplicates found."
              : "previewUrl" in message
                ? (
                    <>
                      {message.message}{" "}
                      <a
                        href={message.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        View preview
                      </a>
                    </>
                  )
                : "Saved."
            : message.error}
        </p>
      )}

      {/* Main Info */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900">Basic Information</h2>
        {ownerMode && (
          <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            Title: <strong>{listing?.title}</strong> · Status:{" "}
            <strong>{listing?.status}</strong> · Tier: <strong>{listing?.tier}</strong>
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {!ownerMode ? (
            <>
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
            </>
          ) : (
            <div className="sm:col-span-2">
              <label className={labelCls}>Company name</label>
              <input name="companyName" defaultValue={listing?.companyName ?? ""} className={inputCls} />
            </div>
          )}
          {!ownerMode && (
            <div>
              <label className={labelCls}>Company name</label>
              <input name="companyName" defaultValue={listing?.companyName ?? ""} className={inputCls} />
            </div>
          )}
        </div>

        {!ownerMode && (
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
        )}
      </section>

      {/* Contact Info */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900">Contact Information</h2>
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
        </div>
      </section>

      {/* Address */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900">Location</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Address</label>
            <input name="address" defaultValue={listing?.address ?? ""} className={inputCls} />
          </div>
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
          <div>
            <label className={labelCls}>Latitude</label>
            <input name="lat" type="number" step="any" defaultValue={listing?.lat ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Longitude</label>
            <input name="lng" type="number" step="any" defaultValue={listing?.lng ?? ""} className={inputCls} />
          </div>
        </div>
      </section>

      {/* Images */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900">Images</h2>
        <div className="space-y-8">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">Avatar Image (Main Listing Image)</h3>
            <p className="text-xs text-zinc-500 mb-3">Recommended: 800x800px, 1:1 ratio. Used as the main listing image on detail pages and in search results.</p>
            <ImageUploader
              name="avatarImage"
              label="Avatar Image (main listing image)"
              currentAssetId={listing?.avatarImage ?? null}
            />
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">Feed Image (Directory Cards)</h3>
            <p className="text-xs text-zinc-500 mb-3">Recommended: 800x600px, 4:3 ratio. Used for listing cards in directory grids and category pages.</p>
            <ImageUploader
              name="feedImage"
              label="Feed Image (for directory cards)"
              currentAssetId={listing?.feedImage ?? null}
            />
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">Gallery Images</h3>
            <p className="text-xs text-zinc-500 mb-3">Recommended: 1200x800px, 3:2 ratio. Additional photos displayed in the listing gallery. Select multiple images from the Media Library.</p>
            <GalleryImagesUploader
              name="galleryImages"
              currentAssetIds={listing?.galleryImages ? JSON.parse(listing.galleryImages) : []}
            />
          </div>
          <div>
            <label className={labelCls}>Video URL</label>
            <input name="videoUrl" type="url" defaultValue={listing?.videoUrl ?? ""} className={inputCls} placeholder="https://youtube.com/... or https://vimeo.com/..." />
          </div>
        </div>
      </section>

      {/* Descriptions */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900">Descriptions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <RichTextarea
              name="summary"
              label="Summary (short description for cards/previews)"
              value={listing?.summary ?? ""}
              placeholder="Brief summary for listing cards..."
            />
          </div>
          <div className="sm:col-span-2">
            <RichTextarea
              name="description"
              label="Full Description"
              value={listing?.description ?? ""}
              placeholder="Full description with formatting..."
            />
          </div>
        </div>
      </section>

      {/* Hours of Operation */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900">Hours of Operation</h2>
        <HoursEditor value={listing?.hoursOfOperation ?? null} />
      </section>

      {/* Rich Profile Fields */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900">Profile Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Specialties</label>
            <ListEditor name="specialties" value={listing?.specialties ?? null} placeholder="Counseling, Therapy, Residential" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Amenities</label>
            <ListEditor name="amenities" value={listing?.amenities ?? null} placeholder="WiFi, Parking, Outdoor Space" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Certifications</label>
            <ListEditor name="certifications" value={listing?.certifications ?? null} placeholder="State Licensed, JCAHO Accredited" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Insurance Accepted</label>
            <ListEditor name="insuranceAccepted" value={listing?.insuranceAccepted ?? null} placeholder="Private Pay, Insurance, Medicaid" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Pricing</label>
            <PricingEditor value={listing?.pricing ?? null} />
          </div>
        </div>
      </section>

      {/* SEO Fields */}
      {!ownerMode && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
          <h2 className="text-lg font-semibold text-zinc-900">SEO</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>SEO Title</label>
              <input name="seoTitle" defaultValue={listing?.seoTitle ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Meta Description</label>
              <input name="metaDesc" defaultValue={listing?.metaDesc ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Focus Keyphrase</label>
              <input name="focusKeyphrase" defaultValue={listing?.focusKeyphrase ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Canonical URL</label>
              <input name="canonicalUrl" type="url" defaultValue={listing?.canonicalUrl ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>OG Image Asset ID</label>
              <input name="ogImage" defaultValue={listing?.ogImage ?? ""} className={inputCls} />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" name="robotsIndex" defaultChecked={listing?.robotsIndex ?? true} className="h-4 w-4 accent-zinc-900" />
                Index
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" name="robotsFollow" defaultChecked={listing?.robotsFollow ?? true} className="h-4 w-4 accent-zinc-900" />
                Follow
              </label>
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      {!ownerMode && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
          <h3 className="text-sm font-medium text-zinc-900">Categories * (select at least one)</h3>
          <p className="text-xs text-zinc-500">Listing will appear in selected categories</p>
          {categories.length === 0 ? (
            <p className="text-amber-600 text-sm">No categories available. Create categories first in Admin → Topics.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer">
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
                  <span className="truncate">{c.title}</span>
                </label>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Regions */}
      {!ownerMode && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
          <h3 className="text-sm font-medium text-zinc-900">Nearby Areas (3–5 recommended)</h3>
          <p className="text-xs text-zinc-500">These regions appear in the listing&apos;s area coverage</p>
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
        </section>
      )}

      <div className="flex flex-wrap gap-3 pt-4 border-t border-zinc-200">
        {!ownerMode && (
          <>
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                startTransition(async () => {
                  const res = await previewListing(
                    new FormData(e.currentTarget.form ?? undefined),
                  );
                  setMessage(res);
                  if (res.ok && "previewUrl" in res && res.previewUrl) {
                    window.open(res.previewUrl, "_blank", "noopener,noreferrer");
                  }
                });
              }}
              disabled={isPending}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Preview Listing
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                startTransition(async () => {
                  const res = await checkDuplicateListing(
                    new FormData(e.currentTarget.form ?? undefined),
                  );
                  setMessage(res);
                });
              }}
              disabled={isPending}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Check for Duplicates
            </button>
          </>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="ml-auto rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}