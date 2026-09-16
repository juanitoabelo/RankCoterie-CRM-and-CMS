"use client";

import { useState, useTransition } from "react";
import { updatePageMeta, type ActionResult } from "../../actions";
import SeoFields, { type SeoData } from "@/components/admin/SeoFields";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";

export default function PageMetaEditor({
  page,
}: {
  page: {
    id: string;
    name: string;
    slug: string;
    title: string;
    status: string;
    seoTitle: string | null;
    metaDesc: string | null;
    metaKeywords: string | null;
    focusKeyphrase: string | null;
    ogImage: string | null;
    canonicalUrl: string | null;
    robotsIndex: boolean;
    robotsFollow: boolean;
    jsonSchema: string | null;
  };
}) {
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [seoData, setSeoData] = useState<SeoData>({
    seoTitle: page.seoTitle ?? "",
    metaDesc: page.metaDesc ?? "",
    metaKeywords: page.metaKeywords ? JSON.parse(page.metaKeywords) : [],
    focusKeyphrase: page.focusKeyphrase ?? "",
    ogImage: page.ogImage ?? "",
    canonicalUrl: page.canonicalUrl ?? "",
    robotsIndex: page.robotsIndex,
    robotsFollow: page.robotsFollow,
    jsonSchema: page.jsonSchema ?? "",
  });
  const [slug, setSlug] = useState(page.slug);

  const action = updatePageMeta.bind(null, page.id);

  const onSubmit = (formData: FormData) => {
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
      const res = await action(formData);
      setMessage(res);
    });
  };

  return (
    <form action={onSubmit}>
      {message && (
        <p className={`mb-3 text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Settings saved." : message.error}
        </p>
      )}

      {/* Page Settings */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Name</label>
          <input name="name" required defaultValue={page.name} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Slug</label>
          <input
            name="slug"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            defaultValue={page.slug}
            className={inputCls}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Title</label>
          <input name="title" defaultValue={page.title} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select name="status" defaultValue={page.status} className={inputCls}>
            <option value="DRAFT">Draft</option>
            <option value="LIVE">Live</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>

      {/* SEO Section */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-medium text-zinc-900">SEO &amp; Social</h3>
        <SeoFields data={seoData} onChange={setSeoData} slugPreview={slug} />
      </div>

      {/* Single Save Button for everything */}
      <div className="mt-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
        >
          {isPending ? "Saving..." : "Save Settings & SEO"}
        </button>
        <p className="text-xs text-zinc-500">
          Saves page settings, SEO metadata, and JSON schema together.
        </p>
      </div>
    </form>
  );
}
