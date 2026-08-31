"use client";

import { useState, useTransition } from "react";
import {
  createArticle,
  updateArticle,
  type ActionResult,
} from "@/app/(admin)/admin/articles/actions";

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

  const action = article
    ? updateArticle.bind(null, article.id)
    : createArticle;

  const onSubmit = (formData: FormData) => {
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
        <textarea
          name="body"
          rows={14}
          required
          defaultValue={article?.body ?? ""}
          className={`${inputCls} font-mono text-xs leading-relaxed`}
          placeholder="<h2>Article heading</h2>&#10;<p>Your content here. Use {{region}} to localize.</p>"
        />
      </div>

      <div>
        <label className={labelCls}>Meta description (SEO)</label>
        <textarea
          name="metaDesc"
          rows={2}
          defaultValue={article?.metaDesc ?? ""}
          className={inputCls}
          placeholder="Brief description for search engines..."
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
      >
        {isPending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
