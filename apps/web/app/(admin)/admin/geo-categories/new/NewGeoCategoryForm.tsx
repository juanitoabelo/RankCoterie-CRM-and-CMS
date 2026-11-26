"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createGeoCategory, type ActionResult } from "../actions";
import { generateAlternateIntroWithAi } from "../ai-actions";
import RichTextarea from "@/components/admin/RichTextarea";
import ImageUploader from "@/components/admin/ImageUploader";
import SeoFields, { DEFAULT_SEO_DATA, type SeoData } from "@/components/admin/SeoFields";
import CustomFieldsEditor from "@/components/admin/custom-fields/CustomFieldsEditor";
import GeoCategoryTokenHelp from "@/components/admin/geo-category/GeoCategoryTokenHelp";
import {
  countWordsFromHtml,
  generateAlternateIntro,
  MIN_ALT_INTRO_WORDS,
} from "@/lib/admin/geo-category-alt-intro";

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

interface AltRow {
  id: number;
  state: string;
  area: string;
  content: string;
  revision: number;
  wordCount?: number;
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
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [parentContent, setParentContent] = useState("");
  const [stateInit, setStateInit] = useState("");
  const [stateDesc, setStateDesc] = useState("");
  const [cityInit, setCityInit] = useState("");
  const [cityDesc, setCityDesc] = useState("");
  const [altRows, setAltRows] = useState<AltRow[]>([
    { id: 0, state: "", area: "", content: "", revision: 0, wordCount: 0 },
  ]);
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
    setAltRows((rows) => [
      ...rows,
      { id: nextRowId.current, state: "", area: "", content: "", revision: 0, wordCount: 0 },
    ]);
    nextRowId.current += 1;
  }

  function removeAltRow(id: number) {
    setAltRows((rows) => rows.filter((r) => r.id !== id));
  }

  function updateAltRow(id: number, patch: Partial<AltRow>) {
    setAltRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const hasAltIntroSource = Boolean(
    parentContent || stateInit || stateDesc || cityInit || cityDesc,
  );

  function generateAltIntro(id: number) {
    const row = altRows.find((r) => r.id === id);
    if (!row || !hasAltIntroSource) return;
    const stateName = states.find((s) => s.state === row.state)?.stateFull ?? row.state;
    const result = generateAlternateIntro({
      areaPart: row.area,
      stateName,
      parentContentHtml: parentContent,
      stateIntroHtml: stateInit,
      stateStaticHtml: stateDesc,
      cityIntroHtml: cityInit,
      cityStaticHtml: cityDesc,
    });
    updateAltRow(id, {
      content: result.html,
      wordCount: result.wordCount,
      revision: row.revision + 1,
    });
  }

  function generateAiAltIntro(id: number) {
    const row = altRows.find((r) => r.id === id);
    if (!row || !hasAltIntroSource) return;
    setAiError(null);
    setAiPending(true);
    const stateName = states.find((s) => s.state === row.state)?.stateFull ?? row.state;

    startTransition(async () => {
      try {
        const result = await generateAlternateIntroWithAi({
          areaPart: row.area,
          stateName,
          parentContentHtml: parentContent,
          stateIntroHtml: stateInit,
          stateStaticHtml: stateDesc,
          cityIntroHtml: cityInit,
          cityStaticHtml: cityDesc,
        });
        if (!result.ok) {
          setAiError(result.error);
          return;
        }
        updateAltRow(id, {
          content: result.html,
          wordCount: result.wordCount,
          revision: row.revision + 1,
        });
      } finally {
        setAiPending(false);
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <Link href="/admin/geo-categories" className="hover:text-zinc-700">GeoCategory Pages</Link> /{" "}
        <span className="text-zinc-700">Add New</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Add New GeoCategory</h1>

      <form action={onSubmit} className="mt-8 space-y-8">
        <CustomFieldsEditor contentType="geo-category" />
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

        {/* Parent Page Content */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Category Parent Page</h2>
          <RichTextarea
            name="description"
            label="Category Parent Content"
            placeholder="Write parent page content..."
            value={parentContent}
            onChange={setParentContent}
            hint={<GeoCategoryTokenHelp summary="Parent page tokens" />}
          />
          <ImageUploader
            name="parentImageAssetId"
            label="Parent Image"
            hint="Suggested size: 1600 × 900 px (16:9)"
          />
        </div>

        {/* State Page */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">GeoCategory State Page</h2>
          <RichTextarea
            name="stateInit"
            label="State Page Content (Intro)"
            placeholder="Write state intro content..."
            value={stateInit}
            onChange={setStateInit}
            hint={<GeoCategoryTokenHelp summary="State intro tokens" />}
          />
          <RichTextarea
            name="stateDesc"
            label="State Page Content (Static)"
            placeholder="Write state static content..."
            value={stateDesc}
            onChange={setStateDesc}
            hint={<GeoCategoryTokenHelp summary="State static content tokens" />}
          />
          <ImageUploader
            name="stateImageAssetId"
            label="State Image"
            hint="Suggested size: 1600 × 900 px (16:9)"
          />
        </div>

        {/* City Page */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">GeoCategory City Page</h2>
          <RichTextarea
            name="cityInit"
            label="City Page Content (Intro)"
            placeholder="Write city intro content..."
            value={cityInit}
            onChange={setCityInit}
            hint={<GeoCategoryTokenHelp summary="City intro tokens" />}
          />
          <RichTextarea
            name="cityDesc"
            label="City Page Content (Static)"
            placeholder="Write city static content..."
            value={cityDesc}
            onChange={setCityDesc}
            hint={<GeoCategoryTokenHelp summary="City static content tokens" />}
          />
          <ImageUploader
            name="cityImageAssetId"
            label="City Image"
            hint="Suggested size: 1600 × 900 px (16:9)"
          />
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
            &quot;Generate unique with AI&quot; rewrites the Parent, State and City content into fresh local copy focused
            on the selected state and area. &quot;Generate from parent content&quot; is the deterministic fallback. Both
            keep tokens intact and enforce at least {MIN_ALT_INTRO_WORDS} words; Google has no fixed word minimum.
          </p>
          {aiError && <p className="text-xs text-red-600">{aiError}</p>}
          <input type="hidden" name="altCount" value={altRows.length} />

          {altRows.map((row, index) => (
            <div key={row.id} className="space-y-3 rounded-lg border border-zinc-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Alternate Intro {index + 1}</span>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => generateAiAltIntro(row.id)}
                    disabled={!hasAltIntroSource || !row.area || aiPending}
                    className="text-xs font-medium text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:text-zinc-400"
                  >
                    {aiPending ? "Generating with AI..." : "Generate unique with AI"}
                  </button>
                  <button
                    type="button"
                    onClick={() => generateAltIntro(row.id)}
                    disabled={!hasAltIntroSource || !row.area}
                    className="text-xs font-medium text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-zinc-400"
                  >
                    Generate from parent content
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAltRow(row.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {(row.wordCount ?? 0) > 0 && (
                <p
                  className={`text-xs ${
                    (row.wordCount ?? 0) >= MIN_ALT_INTRO_WORDS ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {row.wordCount} words —{" "}
                  {(row.wordCount ?? 0) >= MIN_ALT_INTRO_WORDS
                    ? "meets the internal content target."
                    : `below the ${MIN_ALT_INTRO_WORDS}-word internal target; add more parent/state/city content.`}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-800">
                    Alternate Intro for City Pages of Which State?
                  </label>
                  <select
                    name={`altState_${index}`}
                    value={row.state}
                    onChange={(e) => updateAltRow(row.id, { state: e.target.value })}
                    className={inputCls}
                  >
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
                  <select
                    name={`altArea_${index}`}
                    value={row.area}
                    onChange={(e) => updateAltRow(row.id, { area: e.target.value })}
                    className={inputCls}
                  >
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
                key={`${row.id}-${row.revision}`}
                name={`altContent_${index}`}
                label="Alternate Intro Content"
                placeholder="Write alternate intro content..."
                value={row.content}
                onChange={(html) => updateAltRow(row.id, { content: html, wordCount: countWordsFromHtml(html) })}
                hint={<GeoCategoryTokenHelp summary="Alternate intro tokens" />}
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
            SEO title and meta description use the same tokens below. Canonical URL applies to the parent page only;
            region pages always self-canonicalize. JSON-LD schema does not process tokens. Robots settings apply to all
            /g/ pages of this GeoCategory.
          </p>
          <GeoCategoryTokenHelp summary="SEO title & meta description tokens" />
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
