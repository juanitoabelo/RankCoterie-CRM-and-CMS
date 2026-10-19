"use client";

import { useState } from "react";
import type { Block } from "@/lib/page-builder/types";
import type {
  ContentPageKind,
  ContentPageTemplateBlock,
  CpSidebarWidget,
} from "@/lib/content-page-template/types";
import RichTextEditor from "../page-builder/RichTextEditor";
import { inputCls, labelCls } from "../page-builder/settings";
import BlockStyleTab from "../page-builder/BlockStyleTab";
import ElementStyleTab from "../page-builder/ElementStyleTab";
import BlockAdvancedTab from "../page-builder/BlockAdvancedTab";
import BlockEditor from "../page-builder/BlockEditor";
import ContentPageBindingsEditor from "./ContentPageBindingsEditor";
import { getCpBlockStyleSchema } from "@/lib/content-page-template/style-schema";
import type { ElementStyles } from "@/lib/page-builder/element-style";

type ThemeColor = { key: string; label: string; color: string };

type EditorProps = {
  kind: ContentPageKind;
  block: ContentPageTemplateBlock;
  onChange: (props: ContentPageTemplateBlock["props"]) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdateColumn: (columnId: string, patch: Record<string, unknown>) => void;
  onAddToColumn: (columnId: string, type: import("@/lib/page-builder/types").BlockType) => void;
  allowCpBindings?: boolean;
  themeColors?: ThemeColor[];
};

function createSetter(block: ContentPageTemplateBlock, onChange: EditorProps["onChange"]) {
  return (patch: Record<string, unknown>) =>
    onChange({ ...block.props, ...patch } as ContentPageTemplateBlock["props"]);
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

/* ── Block-specific Style tab ───────────────────────────────────────────── */

function CpStyleTab({
  blockType,
  p,
  set,
}: {
  blockType: string;
  p: Record<string, unknown>;
  set: (patch: Record<string, unknown>) => void;
}) {
  const schema = getCpBlockStyleSchema(blockType);
  if (!schema) return <BlockStyleTab props={p} set={set} />;
  return (
    <ElementStyleTab
      schema={schema}
      value={p.elementStyles as ElementStyles | undefined}
      onChange={(next) => set({ elementStyles: next })}
    />
  );
}

/* ── Content Page Hero Editor ─────────────────────────────────────────── */

function CpHeroEditor({ kind, block, onChange }: EditorProps) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);
  const noun = kind === "topic" ? "Topic" : "SubTopic";

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
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input type="checkbox" className={checkboxCls} checked={p.showAuthor !== false} onChange={(e) => set({ showAuthor: e.target.checked })} />
            Show author
          </label>
          <label className={labelCls}>
            Heading (fallback — bind to {noun} title)
            <input type="text" value={(p.heading as string) || ""} onChange={(e) => set({ heading: e.target.value })} placeholder={`${noun} title`} className={inputCls} />
          </label>
          <div>
            <span className="text-xs font-medium text-zinc-700">Subheading (bind to description)</span>
            <RichTextEditor
              value={(p.subheading as string) || ""}
              onChange={(html) => set({ subheading: html })}
              placeholder={`Leave empty to use the ${noun} description`}
              minHeight={100}
            />
          </div>
        </div>
      )}
      {tab === "style" && <CpStyleTab blockType={block.type} p={p} set={set} />}
      {tab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Content Page Content Editor ──────────────────────────────────────── */

function CpContentEditor({ kind, block, onChange }: EditorProps) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);
  const noun = kind === "topic" ? "Topic" : "SubTopic";

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
            <span className="text-xs font-medium text-zinc-700">Content (bind to {noun} body)</span>
            <RichTextEditor
              value={(p.content as string) || ""}
              onChange={(html) => set({ content: html })}
              placeholder={`Leave empty to use the ${noun} body`}
              minHeight={140}
            />
          </div>
          <label className={labelCls}>
            Max width (px)
            <input type="number" value={(p.maxWidth as number) || 760} onChange={(e) => set({ maxWidth: Number(e.target.value) })} className={inputCls} />
          </label>
        </div>
      )}
      {tab === "style" && <CpStyleTab blockType={block.type} p={p} set={set} />}
      {tab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Content Page Sections Editor ─────────────────────────────────────── */

function CpSectionsEditor({ block, onChange }: EditorProps) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <Tabs active={tab} onChange={setTab} />
      {tab === "content" && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">
            Lists the page&apos;s own sections (Topic sections / SubTopic linked sections).
          </p>
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input type="checkbox" className={checkboxCls} checked={p.showHeading !== false} onChange={(e) => set({ showHeading: e.target.checked })} />
            Show heading
          </label>
          {p.showHeading !== false && (
            <label className={labelCls}>
              Heading
              <input type="text" value={(p.heading as string) || ""} onChange={(e) => set({ heading: e.target.value })} placeholder="More on this topic" className={inputCls} />
            </label>
          )}
          <label className={labelCls}>
            Empty message
            <textarea
              value={(p.emptyMessage as string) || ""}
              onChange={(e) => set({ emptyMessage: e.target.value })}
              placeholder="Leave empty to hide this block when there are no sections"
              rows={2}
              className={inputCls}
            />
          </label>
        </div>
      )}
      {tab === "style" && <CpStyleTab blockType={block.type} p={p} set={set} />}
      {tab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Content Page Sidebar Editor ──────────────────────────────────────── */

function CpSidebarEditor({ kind, block, onChange }: EditorProps) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as { widgets: CpSidebarWidget[]; width?: number };
  const set = createSetter(block, onChange);

  const widgetOptions: Array<{ type: CpSidebarWidget["type"]; label: string }> =
    kind === "topic"
      ? [
          { type: "sections", label: "Sections" },
          { type: "subtopics", label: "Related SubTopics" },
          { type: "geoStates", label: "Programs by state" },
          { type: "custom", label: "Custom HTML" },
        ]
      : [
          { type: "sections", label: "Sections" },
          { type: "topic", label: "Parent Topic" },
          { type: "custom", label: "Custom HTML" },
        ];

  const updateWidget = (i: number, patch: Record<string, unknown>) => {
    const widgets = [...p.widgets];
    widgets[i] = { ...widgets[i], ...patch } as CpSidebarWidget;
    set({ widgets });
  };

  const addWidget = (type: CpSidebarWidget["type"]) => {
    set({
      widgets: [
        ...p.widgets,
        type === "custom"
          ? { type, heading: "Custom widget", content: "<p>Your HTML here</p>" }
          : type === "sections" || type === "topic"
            ? { type, heading: "Widget" }
            : { type, heading: "Widget", limit: 5 },
      ],
    });
  };

  const removeWidget = (i: number) => {
    set({ widgets: p.widgets.filter((_, j) => j !== i) });
  };

  const hasLimit = (type: CpSidebarWidget["type"]) => type === "subtopics" || type === "geoStates";

  return (
    <div className="space-y-3">
      <Tabs active={tab} onChange={setTab} />
      {tab === "content" && (
        <div className="space-y-3">
          <label className={labelCls}>
            Sidebar width (px)
            <input
              type="number"
              min={200}
              max={480}
              value={p.width || 320}
              onChange={(e) => set({ width: Number(e.target.value) })}
              className={inputCls}
            />
          </label>
          <div className="space-y-2">
            {p.widgets.map((widget, i) => (
              <div key={i} className="space-y-1 rounded border border-zinc-200 p-2">
                <div className="flex items-center justify-between">
                  <select
                    value={widget.type}
                    onChange={(e) => updateWidget(i, { type: e.target.value })}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs"
                  >
                    {widgetOptions.map((option) => (
                      <option key={option.type} value={option.type}>{option.label}</option>
                    ))}
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
                {hasLimit(widget.type) && (
                  <input
                    type="number"
                    value={(widget as { limit?: number }).limit || 5}
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
          <div className="flex flex-wrap gap-1">
            {widgetOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => addWidget(option.type)}
                className="flex-1 whitespace-nowrap rounded border border-dashed border-zinc-300 px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-50"
              >
                + {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {tab === "style" && (
        <CpStyleTab blockType={block.type} p={p as unknown as Record<string, unknown>} set={set} />
      )}
      {tab === "advanced" && <BlockAdvancedTab props={p as Record<string, unknown>} set={set} />}
    </div>
  );
}

/* ── Topic Geo Widget Editor ──────────────────────────────────────────── */

function TopicGeoWidgetEditor({ block, onChange }: EditorProps) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <Tabs active={tab} onChange={setTab} />
      {tab === "content" && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">
            Renders the GeoCategory linked to this Topic (state links + browse link).
            Hidden automatically when the Topic has no linked GeoCategory.
          </p>
          <label className={labelCls}>
            Heading
            <input type="text" value={(p.heading as string) || ""} onChange={(e) => set({ heading: e.target.value })} placeholder="Programs by location" className={inputCls} />
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
            <input type="checkbox" className={checkboxCls} checked={p.showDescription !== false} onChange={(e) => set({ showDescription: e.target.checked })} />
            Show geo description
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input type="checkbox" className={checkboxCls} checked={p.showCount === true} onChange={(e) => set({ showCount: e.target.checked })} />
            Show location count next to heading
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input type="checkbox" className={checkboxCls} checked={p.showBrowseLink !== false} onChange={(e) => set({ showBrowseLink: e.target.checked })} />
            Show &quot;browse&quot; link
          </label>
          <label className={labelCls}>
            Empty message
            <textarea
              value={(p.emptyMessage as string) || ""}
              onChange={(e) => set({ emptyMessage: e.target.value })}
              placeholder="Leave empty to hide this block when there is no linked GeoCategory"
              rows={2}
              className={inputCls}
            />
          </label>
        </div>
      )}
      {tab === "style" && <CpStyleTab blockType={block.type} p={p} set={set} />}
      {tab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Topic SubTopics Editor ───────────────────────────────────────────── */

function TopicSubTopicsEditor({ block, onChange }: EditorProps) {
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
            <input type="text" value={(p.heading as string) || ""} onChange={(e) => set({ heading: e.target.value })} placeholder="Related SubTopics" className={inputCls} />
          </label>
          <label className={labelCls}>
            Limit
            <input type="number" min={1} max={48} value={(p.limit as number) || 12} onChange={(e) => set({ limit: Math.max(1, Number(e.target.value)) })} className={inputCls} />
          </label>
          <label className={labelCls}>
            Columns (desktop)
            <select value={String(p.columnsDesktop ?? 2)} onChange={(e) => set({ columnsDesktop: Number(e.target.value) })} className={inputCls}>
              <option value="1">1 column</option>
              <option value="2">2 columns</option>
              <option value="3">3 columns</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input type="checkbox" className={checkboxCls} checked={p.showDescription !== false} onChange={(e) => set({ showDescription: e.target.checked })} />
            Show summaries
          </label>
          <label className={labelCls}>
            Empty message
            <textarea
              value={(p.emptyMessage as string) || ""}
              onChange={(e) => set({ emptyMessage: e.target.value })}
              placeholder="Leave empty to hide this block when there are no SubTopics"
              rows={2}
              className={inputCls}
            />
          </label>
        </div>
      )}
      {tab === "style" && <CpStyleTab blockType={block.type} p={p} set={set} />}
      {tab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── SubTopic Topic Link Editor ───────────────────────────────────────── */

function SubTopicTopicLinkEditor({ block, onChange }: EditorProps) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <Tabs active={tab} onChange={setTab} />
      {tab === "content" && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">
            A breadcrumb/callout linking back to the parent Topic. Hidden automatically
            when the SubTopic has no parent Topic.
          </p>
          <label className={labelCls}>
            Label
            <input type="text" value={(p.heading as string) || ""} onChange={(e) => set({ heading: e.target.value })} placeholder="Part of" className={inputCls} />
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input type="checkbox" className={checkboxCls} checked={p.showDescription !== false} onChange={(e) => set({ showDescription: e.target.checked })} />
            Show parent Topic description
          </label>
        </div>
      )}
      {tab === "style" && <CpStyleTab blockType={block.type} p={p} set={set} />}
      {tab === "advanced" && <BlockAdvancedTab props={p} set={set} />}
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────────────── */

const CP_EDITOR_MAP: Record<string, (props: EditorProps) => React.ReactNode> = {
  cpHero: CpHeroEditor,
  cpContent: CpContentEditor,
  cpSections: CpSectionsEditor,
  cpSidebar: CpSidebarEditor,
  topicGeoWidget: TopicGeoWidgetEditor,
  topicSubTopics: TopicSubTopicsEditor,
  subtopicTopicLink: SubTopicTopicLinkEditor,
};

export default function ContentPageTemplateEditor({
  kind,
  block,
  onChange,
  onRemove,
  onDuplicate,
  onUpdateColumn,
  onAddToColumn,
  allowCpBindings = true,
  themeColors,
}: EditorProps) {
  const blockType = block.type;
  const SpecificEditor = CP_EDITOR_MAP[blockType];

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
        {allowCpBindings && (
          <div className="mb-4">
            <ContentPageBindingsEditor
              kind={kind}
              blockType={blockType}
              props={block.props as Record<string, unknown>}
              onChange={(props) => onChange(props as ContentPageTemplateBlock["props"])}
            />
          </div>
        )}
        {SpecificEditor ? (
          <SpecificEditor
            kind={kind}
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
            onChange={(props) => onChange(props as ContentPageTemplateBlock["props"])}
            onAddToColumn={onAddToColumn}
          />
        )}
      </div>
    </div>
  );
}
