"use client";

import { useState } from "react";
import type { Block, RowBlock } from "@/lib/page-builder/types";
import type { ColumnData } from "@/lib/page-builder/types";
import GlobalColorPicker from "../header-footer-builder/GlobalColorPicker";
import BuilderImageUploader from "../header-footer-builder/BuilderImageUploader";
import RichTextEditor from "../page-builder/RichTextEditor";
import { inputCls, labelCls } from "../page-builder/settings";
import BlockStyleTab from "../page-builder/BlockStyleTab";
import BlockAdvancedTab from "../page-builder/BlockAdvancedTab";
import RowEditor from "../header-footer-builder/RowEditor";
import SectionEditor from "../header-footer-builder/SectionEditor";

type ThemeColor = { key: string; label: string; color: string };

type EditorProps = {
  block: Block;
  onChange: (props: Block["props"]) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdateColumn: (columnId: string, patch: Record<string, unknown>) => void;
  themeColors?: ThemeColor[];
};

function createSetter(block: Block, onChange: EditorProps["onChange"]) {
  return (patch: Record<string, unknown>) => onChange({ ...block.props, ...patch } as Block["props"]);
}

/* ── Blog Post Grid Editor ────────────────────────────────────────────── */

function BlogPostGridEditor({ block, onChange }: EditorProps) {
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
          <label className={labelCls}>Heading
            <input type="text" value={(p.heading as string) || ""} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>Layout
            <select value={(p.layout as string) || "grid"} onChange={(e) => set({ layout: e.target.value })} className={inputCls}>
              <option value="grid">Grid</option>
              <option value="list">List</option>
              <option value="masonry">Masonry</option>
            </select>
          </label>
          <div>
            <span className={labelCls}>Columns</span>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {([
                { key: "desktop", label: "Desktop", icon: "🖥", prop: "columnsDesktop" },
                { key: "tablet", label: "Tablet", icon: "💻", prop: "columnsTablet" },
                { key: "mobile", label: "Mobile", icon: "📱", prop: "columnsMobile" },
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
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
          <label className={labelCls}>Posts Per Page
            <input type="number" value={(p.postsPerPage as number) || 9} onChange={(e) => set({ postsPerPage: Number(e.target.value) })} min={1} max={50} className={inputCls} />
          </label>
          <label className={labelCls}>Order By
            <select value={(p.orderBy as string) || "date"} onChange={(e) => set({ orderBy: e.target.value })} className={inputCls}>
              <option value="date">Date</option>
              <option value="title">Title</option>
              <option value="popular">Popular</option>
            </select>
          </label>

          {/* Toggle fields */}
          {[
            { key: "showExcerpt", label: "Show Excerpt" },
            { key: "showFeaturedImage", label: "Show Featured Image" },
            { key: "showAuthor", label: "Show Author" },
            { key: "showDate", label: "Show Date" },
            { key: "showCategory", label: "Show Category" },
            { key: "showPagination", label: "Show Pagination" },
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
  themeColors,
}: EditorProps) {
  const blockType = block.type;
  const isContainer = blockType === "row" || blockType === "section";

  if (isContainer) {
    if (blockType === "row") {
      return (
        <RowEditor
          block={block as RowBlock}
          onChange={(props) => onChange(props as Block["props"])}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          onUpdateColumn={onUpdateColumn}
          themeColors={themeColors}
        />
      );
    }
    if (blockType === "section") {
      return (
        <SectionEditor
          block={block as import("@/lib/page-builder/types").SectionBlock}
          onChange={(props) => onChange(props as Block["props"])}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          themeColors={themeColors}
        />
      );
    }
  }

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
          <p className="text-xs text-zinc-400">
            No editor available for this block type.
          </p>
        )}
      </div>
    </div>
  );
}
