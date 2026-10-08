"use client";

import { useMemo, useState } from "react";
import type { Block } from "@/lib/page-builder/types";
import type { ContainerSettings } from "@/lib/blog-template/types";
import type { ArticlePreviewData } from "@/lib/blog-template/article-bindings";
import BlogTemplateRenderer from "./BlogTemplateRenderer";

export default function BlogTemplateVisualPreview({
  blocks,
  containerSettings,
  viewport,
  articles = [],
}: {
  blocks: Block[];
  containerSettings: ContainerSettings;
  viewport: "desktop" | "tablet" | "mobile";
  articles?: ArticlePreviewData[];
}) {
  const [selectedArticleId, setSelectedArticleId] = useState(articles[0]?.id ?? "sample");
  const selectedArticle = useMemo(
    () => articles.find((article) => article.id === selectedArticleId),
    [articles, selectedArticleId],
  );
  const sampleArticle: ArticlePreviewData = {
    id: "preview-article",
    slug: "sample-article",
    title: "A sample article title",
    body: "<p>This is sample article content, shown here so you can preview the single-post template as readers will see it.</p><h2>A section heading</h2><p>Use the Structure Display to select blocks and edit their settings. Changes appear here in the visual preview.</p>",
    metaDesc: "A sample article description for previewing your post template.",
    ogImage: "",
    featuredImage: "",
    featuredImageAlt: "",
    featuredImageCaption: "",
    createdAt: new Date("2026-01-15T12:00:00.000Z"),
    category: { slug: "updates", title: "Updates" },
  };
  const article = selectedArticle ?? sampleArticle;

  return (
    <div
      className={`min-h-[600px] overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm ${
        viewport === "mobile"
          ? "mx-auto w-full max-w-[390px]"
          : viewport === "tablet"
            ? "mx-auto w-full max-w-[768px]"
            : "w-full"
      }`}
    >
      {articles.length > 0 && (
        <div className="mb-5 flex items-center justify-end gap-2 border-b border-zinc-100 pb-3">
          <label htmlFor="single-template-preview-article" className="text-xs font-medium text-zinc-600">
            Preview with article
          </label>
          <select
            id="single-template-preview-article"
            value={selectedArticle ? selectedArticle.id : "sample"}
            onChange={(event) => setSelectedArticleId(event.target.value)}
            className="max-w-64 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs"
          >
            <option value="sample">Sample article</option>
            {articles.map((option) => (
              <option key={option.id} value={option.id}>{option.title}</option>
            ))}
          </select>
        </div>
      )}
      <BlogTemplateRenderer
        blocks={blocks}
        containerSettings={containerSettings}
        templateType="single"
        viewport={viewport}
        article={article}
      />
    </div>
  );
}
