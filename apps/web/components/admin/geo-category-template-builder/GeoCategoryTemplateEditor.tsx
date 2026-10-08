"use client";

import { useState } from "react";
import type { Block } from "@/lib/page-builder/types";
import type { GeoCategoryTemplateBlock, GeoSidebarWidget } from "@/lib/geo-category-template/types";
import RichTextEditor from "../page-builder/RichTextEditor";
import { inputCls, labelCls } from "../page-builder/settings";
import BlockStyleTab from "../page-builder/BlockStyleTab";
import BlockAdvancedTab from "../page-builder/BlockAdvancedTab";
import BlockEditor from "../page-builder/BlockEditor";
import GeoCategoryBindingsEditor from "./GeoCategoryBindingsEditor";

type ThemeColor = { key: string; label: string; color: string };

type EditorProps = {
  block: GeoCategoryTemplateBlock;
  onChange: (props: GeoCategoryTemplateBlock["props"]) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdateColumn: (columnId: string, patch: Record<string, unknown>) => void;
  onAddToColumn: (columnId: string, type: import("@/lib/page-builder/types").BlockType) => void;
  allowGeoBindings?: boolean;
  themeColors?: ThemeColor[];
};

function createSetter(block: GeoCategoryTemplateBlock, onChange: EditorProps["onChange"]) {
  return (patch: Record<string, unknown>) =>
    onChange({ ...block.props, ...patch } as GeoCategoryTemplateBlock["props"]);
}

function Tabs({
  active,
  onChange,
}: {
  active: "content" | "style" | "advanced";
  onChange: (tab: "content" | "style" | "advanced") => void;
}) {
  return (
    <div className="flex border-b border-zinc-200">
      {(["content", "style", "advanced"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 py-2 text-xs font-medium capitalize ${
            active === tab
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

const checkboxCls = "h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900";

/* ── Geo Hero Editor ──────────────────────────────────────────────────── */

function GeoHeroEditor({ block, onChange }: EditorProps) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <Tabs active={tab} onChange={setTab} />
      {tab === "content" && (
        <div className="space-y-3">
          <label className={labelCls}>
            Layout
            <select value={(p.layout as string) || "standard"} onChange={(e) => set({ layout: e.target.value })} className={inputCls}>
              <option value="standard">Standard (left aligned)</option>
              <option value="centered">Centered</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input type="checkbox" className={checkboxCls} checked={p.showBreadcrumb !== false} onChange={(e) => set({ showBreadcrumb: e.target.checked })} />
            Show breadcrumb
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input type="checkbox" className={checkboxCls} checked={p.showDescription !== false} onChange={(e) => set({ showDescription: e.target.checked })} />
            Show description
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input type="checkbox" className={checkboxCls} checked={p.showImage !== false} onChange={(e) => set({ showImage: e.target.checked })} />
            Show primary image
          </label>
          <label className={labelCls}>
            Heading (fallback — bind to category title)
            <input type="text" value={(p.heading as string) || ""} onChange={(e) => set({ heading: e.target.value })} placeholder="Category title" className={inputCls} />
          </label>
          <div>
            <span className="text-xs font-medium text-zinc-700">Subheading (bind to description)</span>
            <RichTextEditor
              value={(p.subheading as string) || ""}
              onChange={(html) => set({ subheading: html })}
              placeholder="Leave empty to use the category description"
              minHeight={100}
            />
          </div>
        </div>
      )}
      {tab === "style" && <BlockStyleTab props={p} set={set} />}
      {tab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Geo Content Editor ───────────────────────────────────────────────── */

function GeoContentEditor({ block, onChange }: EditorProps) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <Tabs active={tab} onChange={setTab} />
      {tab === "content" && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input type="checkbox" className={checkboxCls} checked={p.showHeading === true} onChange={(e) => set({ showHeading: e.target.checked })} />
            Show heading
          </label>
          {p.showHeading === true && (
            <label className={labelCls}>
              Heading
              <input type="text" value={(p.heading as string) || ""} onChange={(e) => set({ heading: e.target.value })} placeholder="Overview" className={inputCls} />
            </label>
          )}
          <div>
            <span className="text-xs font-medium text-zinc-700">Content (bind to state intro / description)</span>
            <RichTextEditor
              value={(p.content as string) || ""}
              onChange={(html) => set({ content: html })}
              placeholder="Leave empty to use the bound geo content"
              minHeight={140}
            />
          </div>
          <label className={labelCls}>
            Max width (px)
            <input type="number" value={(p.maxWidth as number) || 760} onChange={(e) => set({ maxWidth: Number(e.target.value) })} className={inputCls} />
          </label>
        </div>
      )}
      {tab === "style" && <BlockStyleTab props={p} set={set} />}
      {tab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Geo Region Nav Editor ────────────────────────────────────────────── */

function GeoRegionNavEditor({ block, onChange }: EditorProps) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <Tabs active={tab} onChange={setTab} />
      {tab === "content" && (
        <div className="space-y-3">
          <label className={labelCls}>
            Heading
            <input type="text" value={(p.heading as string) || ""} onChange={(e) => set({ heading: e.target.value })} placeholder="Programs by state" className={inputCls} />
          </label>
          <label className={labelCls}>
            Columns
            <select value={String(p.columns ?? 3)} onChange={(e) => set({ columns: Number(e.target.value) })} className={inputCls}>
              <option value="2">2 columns</option>
              <option value="3">3 columns</option>
              <option value="4">4 columns</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input type="checkbox" className={checkboxCls} checked={p.showCount === true} onChange={(e) => set({ showCount: e.target.checked })} />
            Show count next to heading
          </label>
          <label className={labelCls}>
            Empty message
            <textarea
              value={(p.emptyMessage as string) || ""}
              onChange={(e) => set({ emptyMessage: e.target.value })}
              placeholder="Leave empty to hide this block when there are no states"
              rows={2}
              className={inputCls}
            />
          </label>
        </div>
      )}
      {tab === "style" && <BlockStyleTab props={p} set={set} />}
      {tab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Geo Listings Editor ──────────────────────────────────────────────── */

function GeoListingsEditor({ block, onChange }: EditorProps) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <Tabs active={tab} onChange={setTab} />
      {tab === "content" && (
        <div className="space-y-3">
          <label className={labelCls}>
            Heading
            <input type="text" value={(p.heading as string) || ""} onChange={(e) => set({ heading: e.target.value })} placeholder="Featured programs" className={inputCls} />
          </label>
          <label className={labelCls}>
            Listings limit
            <input type="number" min={1} max={48} value={(p.limit as number) || 9} onChange={(e) => set({ limit: Math.max(1, Number(e.target.value)) })} className={inputCls} />
          </label>
          <label className={labelCls}>
            Columns (desktop)
            <select value={String(p.columnsDesktop ?? 3)} onChange={(e) => set({ columnsDesktop: Number(e.target.value) })} className={inputCls}>
              <option value="1">1 column</option>
              <option value="2">2 columns</option>
              <option value="3">3 columns</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input type="checkbox" className={checkboxCls} checked={p.showDescription !== false} onChange={(e) => set({ showDescription: e.target.checked })} />
            Show listing summaries
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input type="checkbox" className={checkboxCls} checked={p.showCount === true} onChange={(e) => set({ showCount: e.target.checked })} />
            Show total count next to heading
          </label>
          <label className={labelCls}>
            Empty message
            <textarea
              value={(p.emptyMessage as string) || ""}
              onChange={(e) => set({ emptyMessage: e.target.value })}
              placeholder="Leave empty to hide this block when there are no listings"
              rows={2}
              className={inputCls}
            />
          </label>
        </div>
      )}
      {tab === "style" && <BlockStyleTab props={p} set={set} />}
      {tab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Geo FAQ Editor ───────────────────────────────────────────────────── */

function GeoFaqEditor({ block, onChange }: EditorProps) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <Tabs active={tab} onChange={setTab} />
      {tab === "content" && (
        <label className={labelCls}>
          Heading
          <input type="text" value={(p.heading as string) || ""} onChange={(e) => set({ heading: e.target.value })} placeholder="Frequently asked questions" className={inputCls} />
        </label>
      )}
      {tab === "style" && <BlockStyleTab props={p} set={set} />}
      {tab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Geo Sidebar Editor ───────────────────────────────────────────────── */

function GeoSidebarEditor({ block, onChange }: EditorProps) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as { widgets: GeoSidebarWidget[]; width?: number };
  const set = createSetter(block, onChange);

  const updateWidget = (i: number, patch: Record<string, unknown>) => {
    const widgets = [...p.widgets];
    widgets[i] = { ...widgets[i], ...patch } as GeoSidebarWidget;
    set({ widgets });
  };

  const addWidget = (type: GeoSidebarWidget["type"]) => {
    set({
      widgets: [
        ...p.widgets,
        type === "custom"
          ? { type, heading: "Custom widget", content: "<p>Your HTML here</p>" }
          : { type, heading: "Widget", limit: 5 },
      ],
    });
  };

  const removeWidget = (i: number) => {
    set({ widgets: p.widgets.filter((_, j) => j !== i) });
  };

  return (
    <div className="space-y-3">
      <Tabs active={tab} onChange={setTab} />
      {tab === "content" && (
        <div className="space-y-3">
          <div className="space-y-2">
            {p.widgets.map((widget, i) => (
              <div key={i} className="space-y-1 rounded border border-zinc-200 p-2">
                <div className="flex items-center justify-between">
                  <select
                    value={widget.type}
                    onChange={(e) => updateWidget(i, { type: e.target.value })}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs"
                  >
                    <option value="states">State links</option>
                    <option value="listings">Listings</option>
                    <option value="faq">FAQ</option>
                    <option value="custom">Custom HTML</option>
                  </select>
                  <button onClick={() => removeWidget(i)} className="text-[10px] text-red-500 hover:underline">
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={widget.heading || ""}
                  onChange={(e) => updateWidget(i, { heading: e.target.value })}
                  placeholder="Heading"
                  className="w-full rounded border border-zinc-300 px-2 py-1 text-xs"
                />
                {widget.type !== "custom" && (
                  <input
                    type="number"
                    value={widget.limit || 5}
                    onChange={(e) => updateWidget(i, { limit: Number(e.target.value) })}
                    placeholder="Limit"
                    className="w-full rounded border border-zinc-300 px-2 py-1 text-xs"
                  />
                )}
                {widget.type === "custom" && (
                  <textarea
                    value={(widget as { content?: string }).content || ""}
                    onChange={(e) => updateWidget(i, { content: e.target.value })}
                    placeholder="<p>Custom HTML…</p>"
                    rows={4}
                    className="w-full rounded border border-zinc-300 px-2 py-1 font-mono text-xs"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            {(["states", "listings", "faq", "custom"] as const).map((type) => (
              <button
                key={type}
                onClick={() => addWidget(type)}
                className="flex-1 rounded border border-dashed border-zinc-300 py-1 text-[10px] capitalize text-zinc-500 hover:bg-zinc-50"
              >
                + {type}
              </button>
            ))}
          </div>
        </div>
      )}
      {tab === "style" && <BlockStyleTab props={p as Record<string, unknown>} set={set} />}
      {tab === "advanced" && <BlockAdvancedTab props={p as Record<string, unknown>} set={set} />}
    </div>
  );
}

/* ── Geo Region Chips Editor ──────────────────────────────────────────── */

function GeoRegionChipsEditor({ block, onChange }: EditorProps) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <Tabs active={tab} onChange={setTab} />
      {tab === "content" && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">
            City links for a state page — shows the child regions of the bound category.
            Hidden automatically on city pages.
          </p>
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input type="checkbox" className={checkboxCls} checked={p.showHeading !== false} onChange={(e) => set({ showHeading: e.target.checked })} />
            Show heading
          </label>
          {p.showHeading !== false && (
            <label className={labelCls}>
              Heading
              <input
                type="text"
                value={(p.heading as string) || ""}
                onChange={(e) => set({ heading: e.target.value })}
                placeholder="Cities in {region} (auto)"
                className={inputCls}
              />
            </label>
          )}
        </div>
      )}
      {tab === "style" && <BlockStyleTab props={p} set={set} />}
      {tab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Geo Filter Bar Editor ────────────────────────────────────────────── */

function GeoFilterBarEditor({ block, onChange }: EditorProps) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <Tabs active={tab} onChange={setTab} />
      {tab === "content" && (
        <p className="text-xs text-zinc-500">
          Sort / tier / rating filter bar. Renders on region pages only — hidden
          automatically on category and city pages.
        </p>
      )}
      {tab === "style" && <BlockStyleTab props={p} set={set} />}
      {tab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────────────── */

const GEO_EDITOR_MAP: Record<string, (props: EditorProps) => React.ReactNode> = {
  geoHero: GeoHeroEditor,
  geoContent: GeoContentEditor,
  geoRegionNav: GeoRegionNavEditor,
  geoListings: GeoListingsEditor,
  geoFaq: GeoFaqEditor,
  geoSidebar: GeoSidebarEditor,
  geoRegionChips: GeoRegionChipsEditor,
  geoFilterBar: GeoFilterBarEditor,
};

export default function GeoCategoryTemplateEditor({
  block,
  onChange,
  onRemove,
  onDuplicate,
  onUpdateColumn,
  onAddToColumn,
  allowGeoBindings = true,
  themeColors,
}: EditorProps) {
  const blockType = block.type;
  const SpecificEditor = GEO_EDITOR_MAP[blockType];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">{blockType}</h3>
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
        {allowGeoBindings && (
          <div className="mb-4">
            <GeoCategoryBindingsEditor
              blockType={blockType}
              props={block.props as Record<string, unknown>}
              onChange={(props) => onChange(props as GeoCategoryTemplateBlock["props"])}
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
            onAddToColumn={onAddToColumn}
            themeColors={themeColors}
          />
        ) : (
          <BlockEditor
            block={block as Block}
            onChange={(props) => onChange(props as GeoCategoryTemplateBlock["props"])}
            onAddToColumn={onAddToColumn}
          />
        )}
      </div>
    </div>
  );
}
