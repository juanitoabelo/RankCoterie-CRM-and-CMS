"use client";

import { useState, useTransition } from "react";
import {
  createArticle,
  updateArticle,
  type ActionResult,
} from "@/app/(admin)/admin/articles/actions";
import RichTextEditor from "./page-builder/RichTextEditor";
import SeoFields, { DEFAULT_SEO_DATA, type SeoData } from "./SeoFields";

export interface ArticleFormCategory {
  id: string;
  slug: string;
  title: string;
}

export interface ArticleFormArticle {
  id: string;
  title: string;
  slug: string;
  body: string;
  metaDesc: string | null;
  categoryId: string | null;
  status: string;
  seoTitle: string | null;
  metaKeywords: string | null;
  focusKeyphrase: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
  jsonSchema: string | null;
}

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";
const STATUSES = ["DRAFT", "SCHEDULED", "LIVE", "DISABLED"];

const TOKEN_HELP = [
  { token: "{{region}}", desc: "Sacramento, CA" },
  { token: "{{in region}}", desc: "in Sacramento, CA" },
  { token: "{{around region}}", desc: "around Sacramento, CA" },
  { token: "{{near region}}", desc: "near Sacramento, CA" },
  { token: "{{catname}}", desc: "Category name" },
  { token: "{{in catname}}", desc: "in Category name" },
];

export default function ArticleForm({
  article,
  categories,
  submitLabel,
}: {
  article: ArticleFormArticle | null;
  categories: ArticleFormCategory[];
  submitLabel: string;
}) {
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showTokens, setShowTokens] = useState(false);
  const [body, setBody] = useState(article?.body ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [seoData, setSeoData] = useState<SeoData>({
    seoTitle: article?.seoTitle ?? "",
    metaDesc: article?.metaDesc ?? "",
    metaKeywords: article?.metaKeywords ? JSON.parse(article.metaKeywords) : [],
    focusKeyphrase: article?.focusKeyphrase ?? "",
    ogImage: article?.ogImage ?? "",
    canonicalUrl: article?.canonicalUrl ?? "",
    robotsIndex: article?.robotsIndex ?? true,
    robotsFollow: article?.robotsFollow ?? true,
    jsonSchema: article?.jsonSchema ?? "",
  });

  const action = article
    ? updateArticle.bind(null, article.id)
    : createArticle;

  const onSubmit = (formData: FormData) => {
    formData.set("body", body);
    // Inject SEO data into formData
    formData.set("seoTitle", seoData.seoTitle);
    formData.set("metaDesc", seoData.metaDesc);
    formData.set("metaKeywords", JSON.stringify(seoData.metaKeywords));
    formData.set("focusKeyphrase", seoData.focusKeyphrase);
    formData.set("ogImage", seoData.ogImage);
    formData.set("canonicalUrl", seoData.canonicalUrl);
    formData.set("robotsIndex", seoData.robotsIndex ? "true" : "false");
    formData.set("robotsFollow", seoData.robotsFollow ? "true" : "false");
    formData.set("jsonSchema", seoData.jsonSchema);
    setMessage(null);
    startTransition(async () => {
      const res = await action(formData);
      setMessage(res);
    });
  };

  return (
    <form action={onSubmit} className="space-y-6">
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Saved." : message.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Title *</label>
          <input
            name="title"
            required
            defaultValue={article?.title ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Slug (URL)</label>
          <input
            name="slug"
            defaultValue={article?.slug ?? ""}
            className={inputCls}
            placeholder="auto-generated from title"
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select name="categoryId" defaultValue={article?.categoryId ?? ""} className={inputCls}>
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {article && (
        <div>
          <label className={labelCls}>Status</label>
          <select name="status" defaultValue={article.status} className="mt-1 w-48 rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <label className={labelCls}>Body * (HTML — tokens supported)</label>
          <button
            type="button"
            onClick={() => setShowTokens(!showTokens)}
            className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700"
          >
            {showTokens ? "Hide tokens" : "Show tokens"}
          </button>
        </div>
        {showTokens && (
          <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-medium text-zinc-600">Available tokens:</p>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {TOKEN_HELP.map((t) => (
                <div key={t.token} className="text-xs">
                  <code className="font-mono text-zinc-800">{t.token}</code>
                  <span className="ml-1 text-zinc-500">→ {t.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-1">
          <RichTextEditor
            value={body}
            onChange={setBody}
            showSource
            minHeight={240}
            placeholder="Write your article content here. Use {{region}} to localize."
          />
          <input type="hidden" name="body" value={body} />
        </div>
      </div>

      {/* SEO Section */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-zinc-900">SEO &amp; Social</h3>
        <SeoFields data={seoData} onChange={setSeoData} slugPreview={slug || article?.slug} />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
        >
          {isPending ? "Saving..." : submitLabel}
        </button>
        <p className="text-xs text-zinc-500">
          Saves article content, SEO metadata, and JSON schema together.
        </p>
      </div>
    </form>
  );
}
