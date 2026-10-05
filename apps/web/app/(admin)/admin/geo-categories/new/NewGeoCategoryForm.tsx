"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createGeoCategory, type ActionResult } from "../actions";
import RichTextarea from "@/components/admin/RichTextarea";
import SeoFields, { DEFAULT_SEO_DATA, type SeoData } from "@/components/admin/SeoFields";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";

interface SectionOption {
  id: string;
  title: string;
  status: string;
}

interface StateOption {
  state: string;
  stateFull: string;
}

const AREA_OPTIONS: { value: string; label: string }[] = [
  { value: "NORTHERN", label: "Northern" },
  { value: "SOUTHERN", label: "Southern" },
  { value: "EASTERN", label: "Eastern" },
  { value: "WESTERN", label: "Western" },
  { value: "CENTRAL", label: "Central" },
];

export default function NewGeoCategoryForm({
  sections,
  states,
}: {
  sections: SectionOption[];
  states: StateOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [altRows, setAltRows] = useState<{ id: number }[]>([{ id: 0 }]);
  const nextRowId = useRef(1);
  const [slug, setSlug] = useState("");
  const [seoData, setSeoData] = useState<SeoData>(DEFAULT_SEO_DATA);

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
      const res = await createGeoCategory(formData);
      setMessage(res);
      if (res.ok) router.push("/admin/geo-categories");
    });
  }

  function addAltRow() {
    setAltRows((rows) => [...rows, { id: nextRowId.current }]);
    nextRowId.current += 1;
  }

  function removeAltRow(id: number) {
    setAltRows((rows) => rows.filter((r) => r.id !== id));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <Link href="/admin/geo-categories" className="hover:text-zinc-700">GeoCategory Pages</Link> /{" "}
        <span className="text-zinc-700">Add New</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Add New GeoCategory</h1>

      <form action={onSubmit} className="mt-8 space-y-8">
        {message && (
          <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
            {message.ok ? "Created." : message.error}
          </p>
        )}

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <label className="block text-sm font-medium text-zinc-800">
            New GeoCategory Title/URL <span className="text-xs text-zinc-400">(use dashes between words)</span>
          </label>
          <input name="title" required placeholder="e.g. Therapeutic Services for Young Adults" className={inputCls} />
          <label className="mt-3 block text-sm font-medium text-zinc-800">
            Slug <span className="text-xs text-zinc-400">(lowercase, hyphens)</span>
          </label>
          <input
            name="slug"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="e.g. therapeutic-services-for-young-adults"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-6">
          <h2 className="text-sm font-medium text-zinc-900">New Category Content (Parent Page)</h2>
          <RichTextarea name="description" label="Category Parent Content" placeholder="Write parent page content..." />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-6">
          <h2 className="text-sm font-medium text-zinc-900">GeoCategory State Page (Intro)</h2>
          <RichTextarea name="stateInit" label="State Page Intro" placeholder="Write state intro content..." />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-6">
          <h2 className="text-sm font-medium text-zinc-900">GeoCategory State Page (Static)</h2>
          <RichTextarea name="stateDesc" label="State Page Static Content" placeholder="Write state static content..." />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-6">
          <h2 className="text-sm font-medium text-zinc-900">GeoCategory City Page (Intro)</h2>
          <RichTextarea name="cityInit" label="City Page Intro" placeholder="Write city intro content..." />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-6">
          <h2 className="text-sm font-medium text-zinc-900">GeoCategory City Page (Static)</h2>
          <RichTextarea name="cityDesc" label="City Page Static Content" placeholder="Write city static content..." />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium text-zinc-900">Add Alternate Intros For GeoCategory Pages</h2>
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
            <div key={row.id} className="space-y-3 rounded-lg border border-zinc-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Alternate Intro {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeAltRow(row.id)}
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
                  <select name={`altState_${index}`} defaultValue="" className={inputCls}>
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
                  <select name={`altArea_${index}`} defaultValue="" className={inputCls}>
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
                placeholder="Write alternate intro content..."
              />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-medium text-zinc-900">Section/Category Assignment</h2>
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
                  <input type="checkbox" name="sectionIds" value={section.id} className="h-4 w-4 rounded border-zinc-300" />
                  <span>{section.title}</span>
                  {section.status !== "LIVE" && (
                    <span className="text-xs text-zinc-400">({section.status.toLowerCase()})</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* SEO / Advanced / Schema — same editor as the Page content type */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-medium text-zinc-900">SEO, Advanced &amp; Schema</h2>
          <p className="text-xs text-zinc-500">
            SEO title and meta description support <code className="rounded bg-zinc-100 px-1 py-0.5">{"{{region}}"}</code>{" "}
            tokens — they are rendered per region page (e.g. &quot;... {"{{in region}}"}&quot;) so every generated page
            keeps a unique title. Canonical URL applies to the parent page only; region pages always self-canonicalize.
            Robots settings apply to all /g/ pages of this GeoCategory.
          </p>
          <SeoFields data={seoData} onChange={setSeoData} slugPreview={slug} />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
        >
          {isPending ? "Saving..." : "SAVE NEW GEOCATEGORY"}
        </button>
      </form>
    </div>
  );
}
