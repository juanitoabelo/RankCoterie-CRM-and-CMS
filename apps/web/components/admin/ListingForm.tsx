"use client";

import { useState, useTransition } from "react";
import RegionPicker, { type PickerRegion } from "@/components/regions/RegionPicker";
import {
  createListing,
  updateListing,
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

export default function ListingForm({
  listing,
  categories,
  regions,
  submitLabel,
}: {
  listing: ListingFormListing | null;
  categories: { id: string; slug: string; title: string }[];
  regions: { id: string; state: string; stateFull: string; city: string | null }[];
  submitLabel: string;
}) {
  const [message, setMessage] = useState<
    ActionResult | DuplicateCheckResult | PreviewListingResult | null
  >(null);
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
                        href={(message as any).previewUrl}
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
              {["SUPPRESSED", "FREE", "STANDARD", "PREMIUM", "FEATURED"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select name="status" defaultValue={listing?.status ?? "DRAFT"} className={inputCls}>
              {["DRAFT", "PENDING_REVIEW", "LIVE", "SUSPENDED", "EXPIRED"].map((s) => (
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
          <div>
            <label className={labelCls}>Domain key</label>
            <input name="domainKey" defaultValue={listing?.domainKey ?? ""} className={inputCls} />
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
        <div>
          <label className={labelCls}>Hours (JSON format)</label>
          <textarea
            name="hoursOfOperation"
            rows={5}
            defaultValue={listing?.hoursOfOperation ?? '{"monday": {"opens": "09:00", "closes": "17:00"}, "tuesday": {"opens": "09:00", "closes": "17:00"}, "wednesday": {"opens": "09:00", "closes": "17:00"}, "thursday": {"opens": "09:00", "closes": "17:00"}, "friday": {"opens": "09:00", "closes": "17:00"}, "saturday": {"opens": "09:00", "closes": "15:00"}, "sunday": {"opens": "00:00", "closes": "00:00"}}'}
            className={inputCls + " font-mono text-sm"}
            placeholder='{"monday": {"opens": "09:00", "closes": "17:00"}, ...}'
          />
          <p className="mt-1 text-xs text-zinc-500">JSON format. Use 24-hour format. Set both opens/closes to "00:00" for closed days.</p>
        </div>
      </section>

      {/* Rich Profile Fields */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900">Profile Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <RichTextarea
              name="description"
              label="Full Description"
              value={listing?.description ?? ""}
              placeholder="Full description with formatting..."
            />
          </div>
          <div className="sm:col-span-2">
            <RichTextarea
              name="specialties"
              label="Specialties (JSON array)"
              value={listing?.specialties ?? '["Counseling", "Therapy", "Residential"]'}
              placeholder='["Counseling", "Therapy", "Residential"]'
            />
          </div>
          <div className="sm:col-span-2">
            <RichTextarea
              name="amenities"
              label="Amenities (JSON array)"
              value={listing?.amenities ?? '["WiFi", "Parking", "Outdoor Space"]'}
              placeholder='["WiFi", "Parking", "Outdoor Space"]'
            />
          </div>
          <div className="sm:col-span-2">
            <RichTextarea
              name="certifications"
              label="Certifications (JSON array)"
              value={listing?.certifications ?? '["State Licensed", "JCAHO Accredited"]'}
              placeholder='["State Licensed", "JCAHO Accredited"]'
            />
          </div>
          <div className="sm:col-span-2">
            <RichTextarea
              name="insuranceAccepted"
              label="Insurance Accepted (JSON array)"
              value={listing?.insuranceAccepted ?? '["Private Pay", "Insurance", "Medicaid"]'}
              placeholder='["Private Pay", "Insurance", "Medicaid"]'
            />
          </div>
          <div className="sm:col-span-2">
            <RichTextarea
              name="pricing"
              label="Pricing (JSON)"
              value={listing?.pricing ?? '{"assessment": 150, "session": 120, "package": 1000}'}
              placeholder='{"assessment": 150, "session": 120, "package": 1000}'
            />
          </div>
          <div className="sm:col-span-2">
            <RichTextarea
              name="videoUrl"
              label="Video URL"
              value={listing?.videoUrl ?? ""}
              placeholder="https://youtube.com/... or https://vimeo.com/..."
            />
          </div>
        </div>
      </section>

      {/* SEO Fields */}
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

      {/* Categories */}
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

      {/* Regions */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <h3 className="text-sm font-medium text-zinc-900">Nearby Areas (3–5 recommended)</h3>
        <p className="text-xs text-zinc-500">These regions appear in the listing's area coverage</p>
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

      <div className="flex flex-wrap gap-3 pt-4 border-t border-zinc-200">
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