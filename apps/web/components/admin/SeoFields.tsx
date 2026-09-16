"use client";

import { useState } from "react";

export type SeoData = {
  seoTitle: string;
  metaDesc: string;
  metaKeywords: string[];
  focusKeyphrase: string;
  ogImage: string;
  canonicalUrl: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  jsonSchema: string;
};

export const DEFAULT_SEO_DATA: SeoData = {
  seoTitle: "",
  metaDesc: "",
  metaKeywords: [],
  focusKeyphrase: "",
  ogImage: "",
  canonicalUrl: "",
  robotsIndex: true,
  robotsFollow: true,
  jsonSchema: "",
};

export default function SeoFields({
  data,
  onChange,
  slugPreview,
}: {
  data: SeoData;
  onChange: (data: SeoData) => void;
  slugPreview?: string;
}) {
  const [activeTab, setActiveTab] = useState<"seo" | "advanced" | "schema">("seo");
  const [newKeyword, setNewKeyword] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const set = <K extends keyof SeoData>(key: K, value: SeoData[K]) =>
    onChange({ ...data, [key]: value });

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && data.metaKeywords.length < 10 && !data.metaKeywords.includes(kw)) {
      set("metaKeywords", [...data.metaKeywords, kw]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (idx: number) => {
    set("metaKeywords", data.metaKeywords.filter((_, i) => i !== idx));
  };

  const validateJson = (value: string) => {
    if (!value.trim()) {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch {
      setJsonError("Invalid JSON");
    }
  };

  const labelCls = "block text-xs font-medium text-zinc-700";
  const inputCls =
    "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";
  const hintCls = "mt-1 text-xs text-zinc-400";

  // Character count helpers
  const titleLen = data.seoTitle.length;
  const descLen = data.metaDesc.length;
  const titleColor = titleLen === 0 ? "text-zinc-400" : titleLen <= 60 ? "text-green-600" : titleLen <= 70 ? "text-amber-600" : "text-red-600";
  const descColor = descLen === 0 ? "text-zinc-400" : descLen <= 155 ? "text-green-600" : descLen <= 160 ? "text-amber-600" : "text-red-600";

  // Google preview
  const previewTitle = data.seoTitle || slugPreview || "Page Title";
  const previewDesc = data.metaDesc || "Meta description will appear here...";
  const previewUrl = slugPreview ? `/${slugPreview}` : "/page-slug";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-200">
        {(["seo", "advanced", "schema"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2.5 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? "border-b-2 border-zinc-900 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tab === "seo" ? "SEO" : tab === "advanced" ? "Advanced" : "Schema"}
          </button>
        ))}
      </div>

      {/* SEO Tab */}
      {activeTab === "seo" && (
        <div className="space-y-5 p-5">
          {/* Focus Keyphrase */}
          <div>
            <label className={labelCls}>Focus keyphrase</label>
            <input
              type="text"
              className={inputCls}
              value={data.focusKeyphrase}
              onChange={(e) => set("focusKeyphrase", e.target.value)}
              placeholder="e.g. Website Design and Development"
            />
            <p className={hintCls}>
              Use the main word or phrase you want your content found for across search.
            </p>
          </div>

          {/* Search Appearance Preview */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="mb-2 text-xs font-medium text-zinc-500">Google preview</p>
            <div className="space-y-0.5">
              <p className="text-[13px] text-[#1a0dab] leading-tight truncate">
                {previewTitle} – Your Site Name
              </p>
              <p className="text-xs text-[#006621]">{previewUrl}</p>
              <p className="text-xs text-[#545454] leading-relaxed line-clamp-2">
                {previewDesc}
              </p>
            </div>
          </div>

          {/* SEO Title */}
          <div>
            <div className="flex items-center justify-between">
              <label className={labelCls}>SEO title</label>
              <span className={`text-xs ${titleColor}`}>{titleLen} characters</span>
            </div>
            <input
              type="text"
              className={inputCls}
              value={data.seoTitle}
              onChange={(e) => set("seoTitle", e.target.value)}
              placeholder="Enter SEO title"
            />
            <div className="mt-1 h-1 w-full rounded-full bg-zinc-200">
              <div
                className={`h-1 rounded-full transition-all ${
                  titleLen === 0 ? "w-0 bg-zinc-300" : titleLen <= 60 ? "bg-green-500" : titleLen <= 70 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min((titleLen / 70) * 100, 100)}%` }}
              />
            </div>
            <p className={hintCls}>Recommended: 50-60 characters. Most titles beyond 60 get truncated.</p>
          </div>

          {/* Slug */}
          <div>
            <label className={labelCls}>Slug</label>
            <input
              type="text"
              className={inputCls}
              value={slugPreview || ""}
              readOnly
              disabled
            />
            <p className={hintCls}>Slug is set from the page/article settings above.</p>
          </div>

          {/* Meta Description */}
          <div>
            <div className="flex items-center justify-between">
              <label className={labelCls}>Meta description</label>
              <span className={`text-xs ${descColor}`}>{descLen} characters</span>
            </div>
            <textarea
              className={inputCls}
              rows={3}
              value={data.metaDesc}
              onChange={(e) => set("metaDesc", e.target.value)}
              placeholder="Enter meta description"
            />
            <div className="mt-1 h-1 w-full rounded-full bg-zinc-200">
              <div
                className={`h-1 rounded-full transition-all ${
                  descLen === 0 ? "w-0 bg-zinc-300" : descLen <= 155 ? "bg-green-500" : descLen <= 160 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min((descLen / 160) * 100, 100)}%` }}
              />
            </div>
            <p className={hintCls}>Recommended: 150-155 characters. Most descriptions beyond 155-160 get truncated.</p>
          </div>

          {/* Meta Keywords */}
          <div>
            <label className={labelCls}>Meta keywords (up to 10)</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {data.metaKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-700"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(i)}
                    className="ml-0.5 text-zinc-400 hover:text-red-500"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            {data.metaKeywords.length < 10 && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  className={inputCls}
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  placeholder="Add keyword and press Enter"
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Add
                </button>
              </div>
            )}
            <p className={hintCls}>{data.metaKeywords.length}/10 keywords added</p>
          </div>

          {/* OG Image */}
          <div>
            <label className={labelCls}>Open Graph Image</label>
            <input
              type="text"
              className={inputCls}
              value={data.ogImage}
              onChange={(e) => set("ogImage", e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            <p className={hintCls}>Recommended: 1200x630px. Used when sharing on social media.</p>
          </div>
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === "advanced" && (
        <div className="space-y-5 p-5">
          {/* Robots Index */}
          <div>
            <label className={labelCls}>Allow search engines to show this content in search results?</label>
            <select
              className={inputCls}
              value={data.robotsIndex ? "yes" : "no"}
              onChange={(e) => set("robotsIndex", e.target.value === "yes")}
            >
              <option value="yes">Yes (default)</option>
              <option value="no">No – set to noindex</option>
            </select>
          </div>

          {/* Robots Follow */}
          <div>
            <label className={labelCls}>Should search engines follow links on this content?</label>
            <div className="mt-1 flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="robotsFollow"
                  checked={data.robotsFollow}
                  onChange={() => set("robotsFollow", true)}
                  className="h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                />
                <span className="text-sm text-zinc-700">Yes</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="robotsFollow"
                  checked={!data.robotsFollow}
                  onChange={() => set("robotsFollow", false)}
                  className="h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                />
                <span className="text-sm text-zinc-700">No</span>
              </label>
            </div>
          </div>

          {/* Canonical URL */}
          <div>
            <label className={labelCls}>Canonical URL</label>
            <input
              type="url"
              className={inputCls}
              value={data.canonicalUrl}
              onChange={(e) => set("canonicalUrl", e.target.value)}
              placeholder="https://example.com/original-page"
            />
            <p className={hintCls}>
              Leave empty to use the current page URL as canonical.
            </p>
          </div>
        </div>
      )}

      {/* Schema Tab */}
      {activeTab === "schema" && (
        <div className="space-y-4 p-5">
          <div>
            <label className={labelCls}>JSON-LD Schema</label>
            <p className={hintCls}>
              Add structured data in JSON-LD format. This will be injected into the page{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5">&lt;head&gt;</code> tag.
            </p>
            <textarea
              className={`${inputCls} font-mono text-xs`}
              rows={12}
              value={data.jsonSchema}
              onChange={(e) => {
                set("jsonSchema", e.target.value);
                validateJson(e.target.value);
              }}
              placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "Page Title"\n}`}
            />
            {jsonError && (
              <p className="mt-1 text-xs text-red-600">{jsonError}</p>
            )}
          </div>

          {/* Schema type shortcuts */}
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-600">Quick insert schema type:</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { type: "WebPage", label: "Web Page" },
                { type: "Article", label: "Article" },
                { type: "Organization", label: "Organization" },
                { type: "LocalBusiness", label: "Local Business" },
                { type: "BreadcrumbList", label: "Breadcrumb" },
                { type: "FAQPage", label: "FAQ" },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    const template = JSON.stringify(
                      {
                        "@context": "https://schema.org",
                        "@type": item.type,
                        name: "",
                        description: "",
                      },
                      null,
                      2,
                    );
                    set("jsonSchema", template);
                    validateJson(template);
                  }}
                  className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
