"use client";

import { useState } from "react";
import type { PageLayoutBlock } from "@/lib/page-layout/types";
import type { ColumnData } from "@/lib/page-builder/types";
import GlobalColorPicker from "../header-footer-builder/GlobalColorPicker";
import BuilderImageUploader from "../header-footer-builder/BuilderImageUploader";
import RichTextEditor from "../page-builder/RichTextEditor";
import { SizeInput, SpacingInput } from "../page-builder/settings";
import type { SizeValue, SpacingValues } from "../page-builder/settings";
import BlockStyleTab from "../page-builder/BlockStyleTab";
import BlockAdvancedTab from "../page-builder/BlockAdvancedTab";
import MediaLibraryPicker from "../page-builder/MediaLibraryPicker";
import RowEditor from "../header-footer-builder/RowEditor";
import SectionEditor from "../header-footer-builder/SectionEditor";

type ThemeColor = { key: string; label: string; color: string };

type EditorProps = {
  block: PageLayoutBlock;
  onChange: (props: PageLayoutBlock["props"]) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdateColumn: (columnId: string, patch: Record<string, unknown>) => void;
  themeColors?: ThemeColor[];
};

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-xs font-medium text-zinc-600";

/** Helper to create a setter that merges props and calls onChange with proper typing */
function createSetter(block: PageLayoutBlock, onChange: EditorProps["onChange"]) {
  return (patch: Record<string, unknown>) => onChange({ ...block.props, ...patch } as PageLayoutBlock["props"]);
}

/* ── Hero Editor ──────────────────────────────────────────────────────── */

function HeroEditor({ block, onChange, themeColors }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as { heading: string; subheading: string; bgColor: string; textColor: string };
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
            <input type="text" value={p.heading} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>Subheading
            <RichTextEditor value={p.subheading} onChange={(v) => set({ subheading: v })} minHeight={60} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <GlobalColorPicker label="Background" value={p.bgColor} onChange={(c) => set({ bgColor: c })} paletteOverride={themeColors} />
            <GlobalColorPicker label="Text Color" value={p.textColor} onChange={(c) => set({ textColor: c })} paletteOverride={themeColors} />
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

/* ── Text Editor ──────────────────────────────────────────────────────── */

function TextEditor({ block, onChange }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as { content: string; align: "left" | "center" | "right" };
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
          <label className={labelCls}>Content
            <RichTextEditor value={p.content} onChange={(v) => set({ content: v })} minHeight={120} textColor={(p as Record<string, unknown>).textColor as string} />
          </label>
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

/* ── Image Editor ─────────────────────────────────────────────────────── */

function ImageEditor({ block, onChange }: EditorProps) {
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
          <BuilderImageUploader label="Choose Image" value={(p.src as string) || ""} onChange={(url) => set({ src: url })} />
          <label className={labelCls}>Alt Text
            <input type="text" value={(p.alt as string) || ""} onChange={(e) => set({ alt: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>Image Resolution
            <select value={(p.imageResolution as string) ?? "full"} onChange={(e) => set({ imageResolution: e.target.value })} className={inputCls}>
              <option value="full">Full</option>
              <option value="large">Large</option>
              <option value="medium">Medium</option>
              <option value="thumbnail">Thumbnail</option>
            </select>
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

/* ── Button Editor ────────────────────────────────────────────────────── */

function ButtonEditor({ block, onChange, themeColors }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as { text: string; url: string; align: string; variant: string };
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
          <label className={labelCls}>Text
            <input type="text" value={p.text} onChange={(e) => set({ text: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>URL
            <input type="text" value={p.url} onChange={(e) => set({ url: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>Alignment
            <select value={p.align} onChange={(e) => set({ align: e.target.value })} className={inputCls}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className={labelCls}>Variant
            <select value={p.variant} onChange={(e) => set({ variant: e.target.value })} className={inputCls}>
              <option value="solid">Solid</option>
              <option value="outline">Outline</option>
            </select>
          </label>
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

/* ── Heading Editor ───────────────────────────────────────────────────── */

function HeadingEditor({ block, onChange }: EditorProps) {
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
          <label className={labelCls}>Text
            <input type="text" value={(p.text as string) || ""} onChange={(e) => set({ text: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>Level
            <select value={(p.level as number) || 2} onChange={(e) => set({ level: Number(e.target.value) })} className={inputCls}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>H{n}</option>
              ))}
            </select>
          </label>
          <label className={labelCls}>Alignment
            <select value={(p.align as string) || "left"} onChange={(e) => set({ align: e.target.value })} className={inputCls}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
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

/* ── Spacer Editor ────────────────────────────────────────────────────── */

function SpacerEditor({ block, onChange }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as { height: number };
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
          <label className={labelCls}>Height (px)
            <input type="number" value={p.height} onChange={(e) => set({ height: Number(e.target.value) || 48 })} min={0} max={500} className={inputCls} />
          </label>
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

/* ── Divider Editor ───────────────────────────────────────────────────── */

function DividerEditor({ block, onChange }: EditorProps) {
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
          <p className="text-xs text-zinc-500">No content settings for divider block.</p>
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

/* ── Embed Editor ─────────────────────────────────────────────────────── */

function EmbedEditor({ block, onChange }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as { html: string };
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
          <label className={labelCls}>HTML
            <textarea value={p.html} onChange={(e) => set({ html: e.target.value })} rows={8} className={inputCls} placeholder="<div>...</div>" />
          </label>
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

/* ── Features Editor ──────────────────────────────────────────────────── */

function FeaturesEditor({ block, onChange }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as { heading: string; items: Array<{ icon: string; title: string; description: string }>; columns: number };
  const set = createSetter(block, onChange);

  const updateItem = (i: number, patch: Record<string, string>) => {
    const items = [...p.items];
    items[i] = { ...items[i], ...patch };
    set({ items });
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
          <label className={labelCls}>Heading
            <input type="text" value={p.heading} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>Columns
            <select value={p.columns} onChange={(e) => set({ columns: Number(e.target.value) })} className={inputCls}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          <div className="space-y-2">
            {p.items.map((item, i) => (
              <div key={i} className="rounded border border-zinc-200 p-2 space-y-1">
                <input type="text" value={item.icon} onChange={(e) => updateItem(i, { icon: e.target.value })} placeholder="Icon" className="w-full rounded border border-zinc-300 px-2 py-1 text-xs" />
                <input type="text" value={item.title} onChange={(e) => updateItem(i, { title: e.target.value })} placeholder="Title" className="w-full rounded border border-zinc-300 px-2 py-1 text-xs" />
                <input type="text" value={item.description} onChange={(e) => updateItem(i, { description: e.target.value })} placeholder="Description" className="w-full rounded border border-zinc-300 px-2 py-1 text-xs" />
                <button onClick={() => set({ items: p.items.filter((_, j) => j !== i) })} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ))}
          </div>
          <button onClick={() => set({ items: [...p.items, { icon: "✓", title: "New Feature", description: "Description" }] })} className="w-full rounded border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50">+ Add Item</button>
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

/* ── FAQ Editor ───────────────────────────────────────────────────────── */

function FaqEditor({ block, onChange }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as { heading: string; items: Array<{ question: string; answer: string }> };
  const set = createSetter(block, onChange);

  const updateItem = (i: number, patch: Record<string, string>) => {
    const items = [...p.items];
    items[i] = { ...items[i], ...patch };
    set({ items });
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
          <label className={labelCls}>Heading
            <input type="text" value={p.heading} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
          </label>
          <div className="space-y-2">
            {p.items.map((item, i) => (
              <div key={i} className="rounded border border-zinc-200 p-2 space-y-1">
                <input type="text" value={item.question} onChange={(e) => updateItem(i, { question: e.target.value })} placeholder="Question" className="w-full rounded border border-zinc-300 px-2 py-1 text-xs" />
                <input type="text" value={item.answer} onChange={(e) => updateItem(i, { answer: e.target.value })} placeholder="Answer" className="w-full rounded border border-zinc-300 px-2 py-1 text-xs" />
                <button onClick={() => set({ items: p.items.filter((_, j) => j !== i) })} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ))}
          </div>
          <button onClick={() => set({ items: [...p.items, { question: "New question?", answer: "Answer here." }] })} className="w-full rounded border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50">+ Add Item</button>
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

/* ── Testimonial Editor ───────────────────────────────────────────────── */

function TestimonialEditor({ block, onChange }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as { items: Array<{ quote: string; author: string; role: string; rating: number }>; display: string; columns: number; heading?: string };
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
            <input type="text" value={p.heading || ""} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>Display
            <select value={p.display} onChange={(e) => set({ display: e.target.value })} className={inputCls}>
              <option value="grid">Grid</option>
              <option value="slider">Slider</option>
            </select>
          </label>
          <label className={labelCls}>Columns
            <select value={p.columns} onChange={(e) => set({ columns: Number(e.target.value) })} className={inputCls}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
          <div className="space-y-2">
            {p.items.map((item, i) => (
              <div key={i} className="rounded border border-zinc-200 p-2 space-y-1">
                <input type="text" value={item.quote} onChange={(e) => {
                  const items = [...p.items]; items[i] = { ...items[i], quote: e.target.value }; set({ items });
                }} placeholder="Quote" className="w-full rounded border border-zinc-300 px-2 py-1 text-xs" />
                <input type="text" value={item.author} onChange={(e) => {
                  const items = [...p.items]; items[i] = { ...items[i], author: e.target.value }; set({ items });
                }} placeholder="Author" className="w-full rounded border border-zinc-300 px-2 py-1 text-xs" />
                <button onClick={() => set({ items: p.items.filter((_, j) => j !== i) })} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ))}
          </div>
          <button onClick={() => set({ items: [...p.items, { quote: "Great product!", author: "John", role: "CEO", rating: 5 }] })} className="w-full rounded border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50">+ Add Item</button>
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

/* ── CTA Editor ───────────────────────────────────────────────────────── */

function CtaEditor({ block, onChange, themeColors }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const p = block.props as { heading: string; body: string; buttonText: string; buttonUrl: string; bgColor: string };
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
            <input type="text" value={p.heading} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>Body
            <RichTextEditor value={p.body} onChange={(v) => set({ body: v })} minHeight={60} />
          </label>
          <label className={labelCls}>Button Text
            <input type="text" value={p.buttonText} onChange={(e) => set({ buttonText: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>Button URL
            <input type="text" value={p.buttonUrl} onChange={(e) => set({ buttonUrl: e.target.value })} className={inputCls} />
          </label>
          <GlobalColorPicker label="Background" value={p.bgColor} onChange={(c) => set({ bgColor: c })} paletteOverride={themeColors} />
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

/* ── Editor Map ───────────────────────────────────────────────────────── */

const EDITOR_MAP: Record<string, React.ComponentType<EditorProps>> = {
  hero: HeroEditor,
  text: TextEditor,
  image: ImageEditor,
  button: ButtonEditor,
  heading: HeadingEditor,
  spacer: SpacerEditor,
  divider: DividerEditor,
  embed: EmbedEditor,
  features: FeaturesEditor,
  faq: FaqEditor,
  testimonial: TestimonialEditor,
  cta: CtaEditor,
};

/* ── Main Editor ──────────────────────────────────────────────────────── */

export default function PageLayoutEditor({
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
          block={block as import("@/lib/page-builder/types").RowBlock}
          onChange={(props) => onChange(props as PageLayoutBlock["props"])}
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
          onChange={(props) => onChange(props as PageLayoutBlock["props"])}
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
