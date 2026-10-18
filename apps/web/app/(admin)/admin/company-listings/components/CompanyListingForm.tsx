"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/admin/ImageUploader";
import RichTextarea from "@/components/admin/RichTextarea";
import RegionPicker, { type PickerRegion } from "@/components/regions/RegionPicker";
import { createCompanyListing, updateCompanyListing } from "../actions";

const labelCls = "block text-sm font-medium text-zinc-700";
const inputCls =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";

export type FormListing = {
  id: string;
  title: string;
  slug: string;
  status: string;
  tier: string;
  website: string | null;
  companyName: string | null;
  summary: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  description: string | null;
  staff: string | null;
  specialties: string[];
  keywords: string | null;
  avatarImage: string | null;
  feedImage: string | null;
  companyId: string | null;
  authorId: string | null;
  companyListingTemplateId: string | null;
  spiderIgnore: boolean;
  categoryIds: string[];
  regionIds: string[];
  sectionIds: string[];
  subTopicIds: string[];
};

type Option = { id: string; label: string };

export default function CompanyListingForm({
  listing,
  siteUrl,
  categories,
  regions,
  sections,
  subTopics,
  companies,
  users,
  templates,
}: {
  listing: FormListing | null;
  siteUrl: string;
  categories: Option[];
  regions: PickerRegion[];
  sections: Option[];
  subTopics: Option[];
  companies: Option[];
  users: Option[];
  templates: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [categoryIds, setCategoryIds] = useState<string[]>(listing?.categoryIds ?? []);
  const [regionIds, setRegionIds] = useState<string[]>(listing?.regionIds ?? []);
  const [sectionIds, setSectionIds] = useState<string[]>(listing?.sectionIds ?? []);
  const [subTopicIds, setSubTopicIds] = useState<string[]>(listing?.subTopicIds ?? []);
  const sectionRef = useRef<HTMLSelectElement>(null);
  const subTopicRef = useRef<HTMLSelectElement>(null);
  const topicRef = useRef<HTMLSelectElement>(null);

  const previewUrl = `${siteUrl.replace(/\/+$/, "")}/LandingPage/${listing?.slug ?? "{slug}"}/`;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const action = listing ? updateCompanyListing.bind(null, listing.id) : createCompanyListing;
    startTransition(async () => {
      const result = await action(fd);
      if (result.ok) {
        setMessage({ type: "ok", text: listing ? "Company page saved." : "Company page created." });
        if (!listing && result.id) {
          router.push(`/admin/company-listings/${result.id}/edit`);
        } else {
          router.refresh();
        }
      } else {
        setMessage({ type: "error", text: result.error ?? "Save failed." });
      }
    });
  }

  const addUnique = (id: string, current: string[], set: (v: string[]) => void) => {
    if (id && !current.includes(id)) set([...current, id]);
  };
  const removeId = (id: string, current: string[], set: (v: string[]) => void) =>
    set(current.filter((x) => x !== id));

  const chipCls =
    "inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={
            message.type === "error"
              ? "rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
              : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700"
          }
        >
          {message.text}
        </div>
      )}

      {/* Header / identity */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">
          {listing ? `Edit: ${listing.title}` : "Add New Company Page"}
        </h2>
        <div>
          <label className={labelCls}>Listing Page URL</label>
          <div className="mt-1 flex items-center gap-3">
            <input readOnly value={previewUrl} className={`${inputCls} bg-zinc-50 font-mono text-xs`} />
            {listing && (
              <a
                href={`/LandingPage/${listing.slug}/`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-sm font-medium text-emerald-700 hover:underline"
              >
                ↗ Preview Listing
              </a>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Company Name (title) *</label>
            <input name="title" required defaultValue={listing?.title ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Slug (URL key)</label>
            <input
              name="slug"
              defaultValue={listing?.slug ?? ""}
              className={inputCls}
              placeholder="auto-generated from title if empty"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Status</label>
            <select name="status" defaultValue={listing?.status ?? "LIVE"} className={inputCls}>
              {["LIVE", "DRAFT", "PENDING_REVIEW", "SUSPENDED", "EXPIRED"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Subtitle (use industry-type or slogan)</label>
            <input name="summary" defaultValue={listing?.summary ?? ""} className={inputCls} />
          </div>
        </div>
      </section>

      {/* Contact / address */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <h3 className="text-base font-semibold text-zinc-900">Company Details</h3>
        <div>
          <label className={labelCls}>Company Website URL</label>
          <input
            name="website"
            type="url"
            defaultValue={listing?.website ?? ""}
            className={inputCls}
            placeholder="https://…"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Company Phone</label>
            <input name="phone" defaultValue={listing?.phone ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Keywords (comma separated)</label>
            <input
              name="keywords"
              defaultValue={listing?.keywords ?? ""}
              className={inputCls}
              placeholder="online marketing,website development,seo"
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Street</label>
          <input name="address" defaultValue={listing?.address ?? ""} className={inputCls} />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>City</label>
            <input name="city" defaultValue={listing?.city ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>State</label>
            <input name="state" defaultValue={listing?.state ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Zip</label>
            <input name="zip" defaultValue={listing?.zip ?? ""} className={inputCls} />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h3 className="text-base font-semibold text-zinc-900">Content</h3>
        <RichTextarea
          name="description"
          label="Description"
          value={listing?.description ?? ""}
          placeholder="Describe the company…"
        />
        <RichTextarea
          name="staff"
          label="Staff"
          value={listing?.staff ?? ""}
          placeholder="Team members…"
        />
        <div>
          <label className={labelCls}>Specialty(ies)</label>
          <textarea
            name="specialties"
            rows={5}
            defaultValue={(listing?.specialties ?? []).join("\n")}
            className={`${inputCls} font-mono text-xs leading-5`}
            placeholder={"Web Development\nMarketing\nSearch Engine Optimization"}
          />
          <p className="mt-1 text-xs text-zinc-400">One specialty per line.</p>
        </div>
      </section>

      {/* Images */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h3 className="text-base font-semibold text-zinc-900">Images</h3>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
          <h4 className="text-sm font-semibold text-zinc-900">Featured Image</h4>
          <p className="mb-3 text-xs text-zinc-500">
            .jpg, .png or .gif — an image with 4w × 3h (4:3) dimensions works best.
          </p>
          <ImageUploader
            name="avatarImage"
            label="Featured image"
            currentAssetId={listing?.avatarImage ?? null}
          />
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
          <h4 className="text-sm font-semibold text-zinc-900">Feed Image</h4>
          <p className="mb-3 text-xs text-zinc-500">
            Used on directory cards and feeds (4:3 recommended).
          </p>
          <ImageUploader
            name="feedImage"
            label="Feed image"
            currentAssetId={listing?.feedImage ?? null}
          />
        </div>
      </section>

      {/* Ownership */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <h3 className="text-base font-semibold text-zinc-900">Ownership</h3>
        <div>
          <label className={labelCls}>Company</label>
          <select name="companyId" defaultValue={listing?.companyId ?? ""} className={inputCls}>
            <option value="">--Select Company--</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>User</label>
          <select name="authorId" defaultValue={listing?.authorId ?? ""} className={inputCls}>
            <option value="">--Select User--</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Admin settings */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-3">
        <h3 className="text-base font-semibold text-zinc-900">Admin Settings</h3>
        <div>
          <label className={labelCls}>Page Template</label>
          <select
            name="companyListingTemplateId"
            defaultValue={listing?.companyListingTemplateId ?? ""}
            className={inputCls}
          >
            <option value="">Default (system layout)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-400">
            Applies only to this landing page. Leave as Default for the system layout —{" "}
            <Link
              href="/admin/company-listing-layouts"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-600 underline hover:text-zinc-900"
            >
              manage templates
            </Link>
            .
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="premium"
            defaultChecked={listing?.tier === "PREMIUM"}
            className="h-4 w-4 accent-zinc-900"
          />
          Premium Listing
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="spiderIgnore"
            defaultChecked={listing?.spiderIgnore ?? false}
            className="h-4 w-4 accent-zinc-900"
          />
          Spider Ignore Content (noindex this page)
        </label>
      </section>

      {/* Widgets: GeoCategory Topics */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <h3 className="text-base font-semibold text-zinc-900">
          Choose/Select Display Widgets For This Listing
        </h3>
        <p className="text-sm font-medium text-zinc-700">
          Select GeoCategory Topic(s) for this listing to display
        </p>
        {categories.length === 0 ? (
          <p className="text-sm text-amber-600">
            No topics available — create topics first in Admin → Topics.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {categories.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={c.id}
                  checked={categoryIds.includes(c.id)}
                  onChange={(e) =>
                    setCategoryIds((prev) =>
                      e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                    )
                  }
                  className="h-4 w-4 accent-zinc-900"
                />
                <span className="truncate">{c.label}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* Widgets: Regions */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-900">Select Regions</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRegionIds(regions.map((r) => r.id))}
              className="rounded bg-zinc-800 px-2.5 py-1 text-xs font-semibold uppercase text-white hover:bg-zinc-600"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => setRegionIds([])}
              className="rounded bg-red-500 px-2.5 py-1 text-xs font-semibold uppercase text-white hover:bg-red-600"
            >
              Clear All
            </button>
          </div>
        </div>
        {regionIds.map((id) => (
          <input key={id} type="hidden" name="regionIds" value={id} />
        ))}
        <RegionPicker
          regions={regions}
          value={regionIds}
          onChange={setRegionIds}
          min={0}
          max={9999}
          minHint=""
          maxHint=""
        />
      </section>

      {/* Section List */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-3">
        <h3 className="text-base font-semibold text-zinc-900">Section List</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select ref={sectionRef} className={`${inputCls} mt-0 max-w-xs`} defaultValue="">
            <option value="">--Select Section--</option>
            {sections
              .filter((s) => !sectionIds.includes(s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={() => addUnique(sectionRef.current?.value ?? "", sectionIds, setSectionIds)}
            className="rounded-md bg-zinc-800 px-3 py-2 text-xs font-semibold uppercase text-white hover:bg-zinc-600"
          >
            Add to Section
          </button>
        </div>
        {sectionIds.map((id) => (
          <input key={id} type="hidden" name="sectionIds" value={id} />
        ))}
        <div className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700">
          Page is included in Section(s) below:
        </div>
        <div className="flex flex-wrap gap-2">
          {sectionIds.length === 0 && <span className="text-sm text-zinc-400">None</span>}
          {sectionIds.map((id) => {
            const s = sections.find((x) => x.id === id);
            return (
              <span key={id} className={chipCls}>
                {s?.label ?? id}
                <button
                  type="button"
                  onClick={() => removeId(id, sectionIds, setSectionIds)}
                  className="font-bold text-zinc-400 hover:text-red-600"
                  aria-label={`Remove section ${s?.label ?? id}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      </section>

      {/* SubTopic List */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-3">
        <h3 className="text-base font-semibold text-zinc-900">SubTopic List</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select ref={subTopicRef} className={`${inputCls} mt-0 max-w-xs`} defaultValue="">
            <option value="">--Select SubTopic--</option>
            {subTopics
              .filter((s) => !subTopicIds.includes(s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={() => addUnique(subTopicRef.current?.value ?? "", subTopicIds, setSubTopicIds)}
            className="rounded-md bg-zinc-800 px-3 py-2 text-xs font-semibold uppercase text-white hover:bg-zinc-600"
          >
            Add to SubTopic
          </button>
        </div>
        {subTopicIds.map((id) => (
          <input key={id} type="hidden" name="subTopicIds" value={id} />
        ))}
        <div className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700">
          Page is included in SubTopic(s) below:
        </div>
        <div className="flex flex-wrap gap-2">
          {subTopicIds.length === 0 && <span className="text-sm text-zinc-400">None</span>}
          {subTopicIds.map((id) => {
            const s = subTopics.find((x) => x.id === id);
            return (
              <span key={id} className={chipCls}>
                {s?.label ?? id}
                <button
                  type="button"
                  onClick={() => removeId(id, subTopicIds, setSubTopicIds)}
                  className="font-bold text-zinc-400 hover:text-red-600"
                  aria-label={`Remove subtopic ${s?.label ?? id}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      </section>

      {/* Topic List — same selection as GeoCategory Topics (single taxonomy in v2) */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-3">
        <h3 className="text-base font-semibold text-zinc-900">Topic List</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select ref={topicRef} className={`${inputCls} mt-0 max-w-xs`} defaultValue="">
            <option value="">--Select Topic--</option>
            {categories
              .filter((c) => !categoryIds.includes(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={() => addUnique(topicRef.current?.value ?? "", categoryIds, setCategoryIds)}
            className="rounded-md bg-zinc-800 px-3 py-2 text-xs font-semibold uppercase text-white hover:bg-zinc-600"
          >
            Add to Topic
          </button>
        </div>
        <div className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700">
          Page is included in Topic(s) below:
        </div>
        <div className="flex flex-wrap gap-2">
          {categoryIds.length === 0 && <span className="text-sm text-zinc-400">None</span>}
          {categoryIds.map((id) => {
            const c = categories.find((x) => x.id === id);
            return (
              <span key={id} className={chipCls}>
                {c?.label ?? id}
                <button
                  type="button"
                  onClick={() => removeId(id, categoryIds, setCategoryIds)}
                  className="font-bold text-zinc-400 hover:text-red-600"
                  aria-label={`Remove topic ${c?.label ?? id}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
        <p className="text-xs text-zinc-400">
          Topics are shared with the GeoCategory widgets above — both manage the same selection.
        </p>
      </section>

      <div className="flex items-center gap-3 border-t border-zinc-200 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold uppercase text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
        >
          {pending
            ? "Saving…"
            : listing
              ? `Update/Save ${listing.title}`
              : "Create Company Page"}
        </button>
        <Link
          href="/admin/company-listings"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
        >
          ← Back to list
        </Link>
      </div>
    </form>
  );
}
