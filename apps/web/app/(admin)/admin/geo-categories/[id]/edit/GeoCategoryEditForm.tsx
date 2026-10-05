"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateGeoCategory, deleteGeoCategory, deleteGeoCategoryImageForm, type ActionResult } from "../../actions";
import RichTextarea from "@/components/admin/RichTextarea";
import ImageUploader from "@/components/admin/ImageUploader";
import SeoFields, { type SeoData } from "@/components/admin/SeoFields";

function parseKeywords(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

interface GeoCategoryImage {
  id: string;
  position: string;
  imageAssetId: string;
}

interface AltIntro {
  state: string;
  areaPart: string;
  customText: string;
}

interface GeoCategory {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  stateInit?: string | null;
  stateDesc?: string | null;
  cityInit?: string | null;
  cityDesc?: string | null;
  seoTitle?: string | null;
  metaDesc?: string | null;
  metaKeywords?: string | null;
  focusKeyphrase?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  jsonSchema?: string | null;
  images: GeoCategoryImage[];
  regionContent: AltIntro[];
  contentSections: { id: string }[];
}

interface SectionOption {
  id: string;
  title: string;
  status: string;
}

interface StateOption {
  state: string;
  stateFull: string;
}

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";

const AREA_OPTIONS: { value: string; label: string }[] = [
  { value: "NORTHERN", label: "Northern" },
  { value: "SOUTHERN", label: "Southern" },
  { value: "EASTERN", label: "Eastern" },
  { value: "WESTERN", label: "Western" },
  { value: "CENTRAL", label: "Central" },
];

export default function EditGeoCategoryForm({
  category,
  sections,
  states,
}: {
  category: GeoCategory;
  sections: SectionOption[];
  states: StateOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [altRows, setAltRows] = useState<{ key: number; initial?: AltIntro }[]>(() =>
    category.regionContent.map((r, i) => ({ key: i, initial: r })),
  );
  const nextRowId = useRef(category.regionContent.length);
  const [slug, setSlug] = useState(category.slug);
  const [seoData, setSeoData] = useState<SeoData>({
    seoTitle: category.seoTitle ?? "",
    metaDesc: category.metaDesc ?? "",
    metaKeywords: parseKeywords(category.metaKeywords),
    focusKeyphrase: category.focusKeyphrase ?? "",
    ogImage: category.ogImage ?? "",
    canonicalUrl: category.canonicalUrl ?? "",
    robotsIndex: category.robotsIndex ?? true,
    robotsFollow: category.robotsFollow ?? true,
    jsonSchema: category.jsonSchema ?? "",
  });

  const parentImage = category.images.find((i) => i.position === "PRIMARY");
  const stateImage = category.images.find((i) => i.position === "STATE");
  const cityImage = category.images.find((i) => i.position === "CITY");

  function onSubmit(formData: FormData) {
    setMessage(null);
    formData.set("seoTitle", seoData.seoTitle);
    formData.set("metaDesc", seoData.metaDesc);
    formData.set("metaKeywords", JSON.stringify(seoData.metaKeywords));
    formData.set("focusKeyphrase", seoData.focusKeyphrase);
    formData.set("ogImage", seoData.ogImage);
    formData.set("canonicalUrl", seoData.canonicalUrl);
    formData.set("robotsIndex", seoData.robotsIndex ? "true" : "false");
    formData.set("robotsFollow", seoData.robotsFollow ? "true" : "false");
    formData.set("jsonSchema", seoData.jsonSchema);
    startTransition(async () => {
      const res = await updateGeoCategory(category.id, formData);
      setMessage(res);
    });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this geo category?")) return;
    startTransition(async () => {
      await deleteGeoCategory(category.id);
      router.push("/admin/geo-categories");
    });
  }

  function handleImageDelete(imageId: string) {
    startTransition(async () => {
      await deleteGeoCategoryImageForm(imageId);
      router.refresh();
    });
  }

  function addAltRow() {
    setAltRows((rows) => [...rows, { key: nextRowId.current }]);
    nextRowId.current += 1;
  }

  function removeAltRow(key: number) {
    setAltRows((rows) => rows.filter((r) => r.key !== key));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <Link href="/admin/geo-categories" className="hover:text-zinc-700">GeoCategory Pages</Link> /{" "}
        <span className="text-zinc-700">{category.title}</span>
      </p>
      <div className="mt-1 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Edit GeoCategory</h1>
        <a
          href={`/g/${category.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          View GeoCategory
        </a>
      </div>

      <form action={onSubmit} className="mt-8 space-y-8">
        {message && (
          <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
            {message.ok ? "Saved." : message.error}
          </p>
        )}

        {/* Title & Slug */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-800">GeoCategory Title *</label>
            <input name="title" required defaultValue={category.title} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">Slug * (lowercase, hyphens)</label>
            <input
              name="slug"
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Parent Page Content */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Category Parent Page</h2>
          <RichTextarea name="description" label="Category Parent Content" value={category.description ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <ImageUploader
              name="parentImageAssetId"
              label="Parent Image"
              currentAssetId={parentImage?.imageAssetId}
            />
            {parentImage && (
              <div className="flex items-end">
                <button type="button" onClick={() => handleImageDelete(parentImage.id)} className="text-xs text-red-600 hover:underline">
                  Remove image
                </button>
              </div>
            )}
          </div>
        </div>

        {/* State Page */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">GeoCategory State Page</h2>
          <RichTextarea name="stateInit" label="State Page Content (Intro)" value={category.stateInit ?? ""} />
          <RichTextarea name="stateDesc" label="State Page Content (Static)" value={category.stateDesc ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <ImageUploader
              name="stateImageAssetId"
              label="State Image"
              currentAssetId={stateImage?.imageAssetId}
            />
            {stateImage && (
              <div className="flex items-end">
                <button type="button" onClick={() => handleImageDelete(stateImage.id)} className="text-xs text-red-600 hover:underline">
                  Remove image
                </button>
              </div>
            )}
          </div>
        </div>

        {/* City Page */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">GeoCategory City Page</h2>
          <RichTextarea name="cityInit" label="City Page Content (Intro)" value={category.cityInit ?? ""} />
          <RichTextarea name="cityDesc" label="City Page Content (Static)" value={category.cityDesc ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <ImageUploader
              name="cityImageAssetId"
              label="City Image"
              currentAssetId={cityImage?.imageAssetId}
            />
            {cityImage && (
              <div className="flex items-end">
                <button type="button" onClick={() => handleImageDelete(cityImage.id)} className="text-xs text-red-600 hover:underline">
                  Remove image
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Alternate Intros */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-zinc-900">Add Alternate Intros For GeoCategory Pages</h2>
            <button
              type="button"
              onClick={addAltRow}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              + Add Alternate Intro
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Alternate intros override the City Page intro for city pages of a specific state and geographical area.
          </p>
          <input type="hidden" name="altCount" value={altRows.length} />

          {altRows.map((row, index) => (
            <div key={row.key} className="space-y-3 rounded-lg border border-zinc-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Alternate Intro {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeAltRow(row.key)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-800">
                    Alternate Intro for City Pages of Which State?
                  </label>
                  <select name={`altState_${index}`} defaultValue={row.initial?.state ?? ""} className={inputCls}>
                    <option value="" disabled>--Select State--</option>
                    {states.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.stateFull} ({s.state})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-800">
                    For City Pages Within Which Geographical Area?
                  </label>
                  <select name={`altArea_${index}`} defaultValue={row.initial?.areaPart ?? ""} className={inputCls}>
                    <option value="" disabled>--Geographical Area--</option>
                    {AREA_OPTIONS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <RichTextarea
                name={`altContent_${index}`}
                label="Alternate Intro Content"
                value={row.initial?.customText ?? ""}
                placeholder="Write alternate intro content..."
              />
            </div>
          ))}
        </div>

        {/* Section/Category Assignment */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Section/Category Assignment</h2>
          <p className="text-xs text-zinc-500">
            Choose Section/Category to include this GeoCategory — selected sections will include this GeoCategory page.
          </p>
          {sections.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No unassigned sections available.{" "}
              <Link href="/admin/sections/new" className="text-blue-600 hover:underline">
                Create a Section/Category
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-2">
              {sections.map((section) => (
                <label key={section.id} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    name="sectionIds"
                    value={section.id}
                    defaultChecked={category.contentSections.some((s) => s.id === section.id)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  <span>{section.title}</span>
                  {section.status !== "LIVE" && (
                    <span className="text-xs text-zinc-400">({section.status.toLowerCase()})</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Alternate Indexes */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Alternate Indexes for GeoCategory City Pages</h2>
          <p className="text-xs text-zinc-500">Add alt text for city page images for SEO purposes.</p>
        </div>

        {/* SEO / Advanced / Schema — same editor as the Page content type */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">SEO, Advanced &amp; Schema</h2>
          <p className="text-xs text-zinc-500">
            SEO title and meta description support <code className="rounded bg-zinc-100 px-1 py-0.5">{"{{region}}"}</code>{" "}
            tokens — they are rendered per region page (e.g. &quot;... {"{{in region}}"}&quot;) so every generated page
            keeps a unique title. Canonical URL applies to the parent page only; region pages always self-canonicalize.
            Robots settings apply to all /g/ pages of this GeoCategory.
          </p>
          <SeoFields data={seoData} onChange={setSeoData} slugPreview={slug} />
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
          >
            {isPending ? "Saving..." : "SAVE GEOCATEGORY"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
