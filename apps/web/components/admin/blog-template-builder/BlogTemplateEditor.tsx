"use client";

import { useEffect, useState } from "react";
import type { Block } from "@/lib/page-builder/types";
import type { BlogTemplateBlock } from "@/lib/blog-template/types";
import GlobalColorPicker from "../header-footer-builder/GlobalColorPicker";
import RichTextEditor from "../page-builder/RichTextEditor";
import { inputCls, labelCls } from "../page-builder/settings";
import BlockStyleTab from "../page-builder/BlockStyleTab";
import BlockAdvancedTab from "../page-builder/BlockAdvancedTab";
import BlockEditor from "../page-builder/BlockEditor";
import ArticleBindingsEditor from "./ArticleBindingsEditor";

type ThemeColor = { key: string; label: string; color: string };

type EditorProps = {
  block: BlogTemplateBlock;
  onChange: (props: BlogTemplateBlock["props"]) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdateColumn: (columnId: string, patch: Record<string, unknown>) => void;
  onAddToColumn: (columnId: string, type: import("@/lib/page-builder/types").BlockType) => void;
  allowArticleBindings?: boolean;
  themeColors?: ThemeColor[];
};

function createSetter(block: BlogTemplateBlock, onChange: EditorProps["onChange"]) {
  return (patch: Record<string, unknown>) => onChange({ ...block.props, ...patch } as BlogTemplateBlock["props"]);
}

/* ── Blog Post Grid Editor ────────────────────────────────────────────── */

function BlogPostGridEditor({ block, onChange }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    try {
      fetch("/api/blog-grid?perPage=1")
        .then((res) => (res.ok ? res.json() : { categories: [] }))
        .then((data) => {
          if (!cancelled && Array.isArray(data.categories)) setCategories(data.categories);
        })
        .catch(() => undefined);
    } catch {
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex border-b border-zinc-200">
        {(["content", "style", "advanced"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-xs font-medium capitalize ${activeTab === tab ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "content" && (
        <div className="space-y-3">
          <label className={labelCls}>Heading
            <input type="text" value={(p.heading as string) || ""} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>Category
              <select value={(p.categoryId as string) || ""} onChange={(e) => set({ categoryId: e.target.value })} className={inputCls}>
                <option value="">All posts</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className={labelCls}>Layout
              <select value={(p.layout as string) || "grid"} onChange={(e) => set({ layout: e.target.value })} className={inputCls}>
                <option value="grid">Grid</option>
                <option value="list">List</option>
                <option value="masonry">Masonry</option>
              </select>
            </label>
          </div>
          <div>
            <span className={labelCls}>Columns</span>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {([
                { key: "desktop", label: "Desktop", icon: "🖥", prop: "columnsDesktop", options: [1, 2, 3, 4, 5, 6] },
                { key: "tablet", label: "Tablet", icon: "💻", prop: "columnsTablet", options: [1, 2, 3, 4] },
                { key: "mobile", label: "Mobile", icon: "📱", prop: "columnsMobile", options: [1, 2, 3] },
              ] as const).map((device) => {
                const value = (p[device.prop] as number) ?? (p.columns as number) ?? 3;
                return (
                  <div key={device.key}>
                    <span className="block text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                      {device.icon} {device.label}
                    </span>
                    <select
                      value={String(value)}
                      onChange={(e) => set({ [device.prop]: Number(e.target.value) })}
                      className="mt-0.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    >
                      {device.options.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>Posts Per Page
              <input type="number" value={(p.postsPerPage as number) || 9} onChange={(e) => set({ postsPerPage: Number(e.target.value) })} min={1} max={48} className={inputCls} />
            </label>
            <label className={labelCls}>Sort
              <select
                value={`${(p.orderBy as string) || "date"}|${(p.sortOrder as string) || "desc"}`}
                onChange={(e) => {
                  const [order, sort] = e.target.value.split("|");
                  set({ orderBy: order, sortOrder: sort });
                }}
                className={inputCls}
              >
                <option value="date|desc">Newest first</option>
                <option value="date|asc">Oldest first</option>
                <option value="title|asc">Title: A–Z</option>
                <option value="title|desc">Title: Z–A</option>
                <option value="popular|desc">Most popular</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>Entrance Animation
              <select value={(p.cardAnimation as string) || "fadeUp"} onChange={(e) => set({ cardAnimation: e.target.value })} className={inputCls}>
                <option value="fadeUp">Fade up</option>
                <option value="zoomIn">Zoom in</option>
                <option value="flip">Flip in</option>
                <option value="slideIn">Slide in</option>
                <option value="none">None</option>
              </select>
            </label>
            <label className={labelCls}>Hover Effect
              <select value={(p.hoverEffect as string) || "lift"} onChange={(e) => set({ hoverEffect: e.target.value })} className={inputCls}>
                <option value="lift">Lift</option>
                <option value="zoom">Image zoom</option>
                <option value="glow">Glow</option>
                <option value="overlay">Read-more overlay</option>
                <option value="none">None</option>
              </select>
            </label>
          </div>

          {/* Toggle fields */}
          {[
            { key: "showExcerpt", label: "Show Excerpt" },
            { key: "showFeaturedImage", label: "Show Featured Image" },
            { key: "showAuthor", label: "Show Author" },
            { key: "showDate", label: "Show Date" },
            { key: "showCategory", label: "Show Category" },
            { key: "showCategoryFilter", label: "Show Category Filter" },
            { key: "showSearch", label: "Show Search" },
            { key: "showPagination", label: "Show Pagination" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className={labelCls}>{label}</span>
              <button type="button" onClick={() => set({ [key]: !p[key] })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p[key] ? "bg-zinc-900" : "bg-zinc-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${p[key] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}

          {p.showCategoryFilter ? (
            <div className="rounded-lg border border-zinc-200 p-2">
              <p className="mb-1 text-[11px] font-medium text-zinc-500">Filter options (none checked = every category)</p>
              <div className="max-h-36 space-y-1 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-[11px] text-zinc-400">No categories yet.</p>
                ) : (
                  categories.map((c) => {
                    const checked = Array.isArray(p.filterCategories) && (p.filterCategories as string[]).includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-zinc-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-300"
                          checked={checked}
                          onChange={(e) => {
                            const current = Array.isArray(p.filterCategories) ? (p.filterCategories as string[]) : [];
                            const next = e.target.checked ? [...current, c.id] : current.filter((x) => x !== c.id);
                            set({ filterCategories: next });
                          }}
                        />
                        {c.name}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>Excerpt Chars
              <input type="number" value={(p.excerptLength as number) ?? 150} onChange={(e) => set({ excerptLength: Number(e.target.value) })} min={0} max={500} className={inputCls} />
            </label>
            {p.showSearch ? (
              <label className={labelCls}>Search Placeholder
                <input type="text" value={(p.searchPlaceholder as string) || ""} onChange={(e) => set({ searchPlaceholder: e.target.value })} className={inputCls} />
              </label>
            ) : null}
          </div>
          <p className="text-[11px] leading-snug text-zinc-400">
            Cards load live from your articles with pagination, filtering and animations on the published page.
          </p>
        </div>
      )}

      {activeTab === "style" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>Card Style
              <select value={(p.cardStyle as string) || "shadow"} onChange={(e) => set({ cardStyle: e.target.value })} className={inputCls}>
                <option value="shadow">Shadow</option>
                <option value="bordered">Bordered</option>
                <option value="minimal">Minimal</option>
              </select>
            </label>
            <label className={labelCls}>Image Aspect
              <select value={(p.imageAspect as string) || "16:9"} onChange={(e) => set({ imageAspect: e.target.value })} className={inputCls}>
                <option value="16:9">16:9</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1</option>
              </select>
            </label>
          </div>
          <BlockStyleTab props={p} set={set} />
        </div>
      )}

      {activeTab === "advanced" && (
        <div className="space-y-3">
          <BlockAdvancedTab props={p} set={set} />
        </div>
      )}
    </div>
  );
}

/* ── Blog Sidebar Editor ──────────────────────────────────────────────── */

function BlogSidebarEditor({ block, onChange }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as { widgets: Array<{ type: string; heading?: string; limit?: number }>; width?: number; position: string };
  const set = createSetter(block, onChange);

  const updateWidget = (i: number, patch: Record<string, unknown>) => {
    const widgets = [...p.widgets];
    widgets[i] = { ...widgets[i], ...patch };
    set({ widgets });
  };

  const addWidget = (type: string) => {
    set({ widgets: [...p.widgets, { type, heading: "", limit: 5 }] });
  };

  const removeWidget = (i: number) => {
    set({ widgets: p.widgets.filter((_, j) => j !== i) });
  };

  return (
    <div className="space-y-3">
      <div className="flex border-b border-zinc-200">
        {(["content", "style", "advanced"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-xs font-medium capitalize ${activeTab === tab ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "content" && (
        <div className="space-y-3">
          <label className={labelCls}>Position
            <select value={p.position || "right"} onChange={(e) => set({ position: e.target.value })} className={inputCls}>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>

          <div className="space-y-2">
            {p.widgets.map((widget, i) => (
              <div key={i} className="rounded border border-zinc-200 p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <select value={widget.type} onChange={(e) => updateWidget(i, { type: e.target.value })} className="rounded border border-zinc-300 px-2 py-1 text-xs">
                    <option value="search">Search</option>
                    <option value="categories">Categories</option>
                    <option value="recentPosts">Recent Posts</option>
                    <option value="tags">Tags</option>
                    <option value="custom">Custom HTML</option>
                  </select>
                  <button onClick={() => removeWidget(i)} className="text-[10px] text-red-500 hover:underline">Remove</button>
                </div>
                <input type="text" value={widget.heading || ""} onChange={(e) => updateWidget(i, { heading: e.target.value })} placeholder="Heading" className="w-full rounded border border-zinc-300 px-2 py-1 text-xs" />
                {(widget.type === "categories" || widget.type === "recentPosts") && (
                  <input type="number" value={widget.limit || 5} onChange={(e) => updateWidget(i, { limit: Number(e.target.value) })} placeholder="Limit" className="w-full rounded border border-zinc-300 px-2 py-1 text-xs" />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {["search", "categories", "recentPosts", "tags", "custom"].map((type) => (
              <button key={type} onClick={() => addWidget(type)} className="flex-1 rounded border border-dashed border-zinc-300 py-1 text-[10px] text-zinc-500 hover:bg-zinc-50 capitalize">
                + {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "style" && (
        <div className="space-y-3">
          <BlockStyleTab props={p as Record<string, unknown>} set={set} />
        </div>
      )}

      {activeTab === "advanced" && (
        <div className="space-y-3">
          <BlockAdvancedTab props={p as Record<string, unknown>} set={set} />
        </div>
      )}
    </div>
  );
}

/* ── Article Content Editor ───────────────────────────────────────────── */

function ArticleContentEditor({ block, onChange }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <div className="flex border-b border-zinc-200">
        {(["content", "style", "advanced"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-xs font-medium capitalize ${activeTab === tab ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "content" && (
        <div className="space-y-3">
          {[
            { key: "showTitle", label: "Show Title" },
            { key: "showMeta", label: "Show Meta" },
            { key: "showAuthor", label: "Show Author" },
            { key: "showDate", label: "Show Date" },
            { key: "showCategory", label: "Show Category" },
            { key: "showFeaturedImage", label: "Show Featured Image" },
            { key: "showSocialShare", label: "Show Social Share" },
            { key: "showNavigation", label: "Show Navigation" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className={labelCls}>{label}</span>
              <button type="button" onClick={() => set({ [key]: !p[key] })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p[key] ? "bg-zinc-900" : "bg-zinc-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${p[key] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
          <label className={labelCls}>Max Width (px)
            <input type="number" value={(p.maxWidth as number) || 720} onChange={(e) => set({ maxWidth: Number(e.target.value) })} min={400} max={1200} className={inputCls} />
          </label>
        </div>
      )}

      {activeTab === "style" && (
        <div className="space-y-3">
          <BlockStyleTab props={p} set={set} />
        </div>
      )}

      {activeTab === "advanced" && (
        <div className="space-y-3">
          <BlockAdvancedTab props={p} set={set} />
        </div>
      )}
    </div>
  );
}

/* ── Article Hero Editor ──────────────────────────────────────────────── */

function ArticleHeroEditor({ block, onChange, themeColors }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <div className="flex border-b border-zinc-200">
        {(["content", "style", "advanced"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-xs font-medium capitalize ${activeTab === tab ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "content" && (
        <div className="space-y-3">
          <label className={labelCls}>Layout
            <select value={(p.layout as string) || "standard"} onChange={(e) => set({ layout: e.target.value })} className={inputCls}>
              <option value="standard">Standard</option>
              <option value="full-width">Full Width</option>
              <option value="centered">Centered</option>
            </select>
          </label>
          {[
            { key: "showBreadcrumb", label: "Show Breadcrumb" },
            { key: "showCategory", label: "Show Category" },
            { key: "showAuthor", label: "Show Author" },
            { key: "showDate", label: "Show Date" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className={labelCls}>{label}</span>
              <button type="button" onClick={() => set({ [key]: !p[key] })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p[key] ? "bg-zinc-900" : "bg-zinc-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${p[key] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "style" && (
        <div className="space-y-3">
          <div className="space-y-3">
            <GlobalColorPicker label="Background" value={(p.bgColor as string) || ""} onChange={(c) => set({ bgColor: c })} paletteOverride={themeColors} />
            <GlobalColorPicker label="Text Color" value={(p.textColor as string) || ""} onChange={(c) => set({ textColor: c })} paletteOverride={themeColors} />
          </div>
          <BlockStyleTab props={p} set={set} />
        </div>
      )}

      {activeTab === "advanced" && (
        <div className="space-y-3">
          <BlockAdvancedTab props={p} set={set} />
        </div>
      )}
    </div>
  );
}

/* ── Editor Map ───────────────────────────────────────────────────────── */

const EDITOR_MAP: Record<string, React.ComponentType<EditorProps>> = {
  blogPostGrid: BlogPostGridEditor,
  blogSidebar: BlogSidebarEditor,
  articleContent: ArticleContentEditor,
  articleHero: ArticleHeroEditor,
};

/* ── Main Editor ──────────────────────────────────────────────────────── */

export default function BlogTemplateEditor({
  block,
  onChange,
  onRemove,
  onDuplicate,
  onUpdateColumn,
  onAddToColumn,
  allowArticleBindings = false,
  themeColors,
}: EditorProps) {
  const blockType = block.type;
  const SpecificEditor = EDITOR_MAP[blockType];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          {blockType}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={onDuplicate}
            className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-100"
          >
            Duplicate
          </button>
          <button
            onClick={onRemove}
            className="rounded px-2 py-1 text-[10px] text-red-500 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="p-4">
        {allowArticleBindings && (
          <div className="mb-4">
            <ArticleBindingsEditor
              blockType={blockType}
              props={block.props as Record<string, unknown>}
              onChange={(props) => onChange(props as BlogTemplateBlock["props"])}
            />
          </div>
        )}
        {SpecificEditor ? (
          <SpecificEditor
            block={block}
            onChange={onChange}
            onRemove={onRemove}
            onDuplicate={onDuplicate}
            onUpdateColumn={onUpdateColumn}
            themeColors={themeColors}
          />
        ) : (
          <BlockEditor
            block={block as Block}
            onChange={(props) => onChange(props as BlogTemplateBlock["props"])}
            onAddToColumn={onAddToColumn}
          />
        )}
      </div>
    </div>
  );
}
