"use client";

import { useState } from "react";
import {
  BLOCK_DEFINITIONS,
  LEAF_BLOCK_TYPES,
  type Block,
  type BlockType,
  type ColumnData,
  type RowBlock,
} from "@/lib/page-builder/types";
import { BackgroundFields, inputCls, labelCls, ResponsiveSpanFields } from "./settings";
import RichTextEditor from "./RichTextEditor";

type EditorProps = {
  block: Block;
  onChange: (props: Block["props"]) => void;
  onAddToColumn?: (columnId: string, type: BlockType) => void;
};

function HeroEditor({
  block,
  onChange,
}: {
  block: Block & { type: "hero" };
  onChange: (props: Block["props"]) => void;
}) {
  return (
    <>
      <div>
        <label className={labelCls}>Heading</label>
        <input
          className={inputCls}
          value={block.props.heading}
          onChange={(e) => onChange({ ...block.props, heading: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>Subheading</label>
        <input
          className={inputCls}
          value={block.props.subheading}
          onChange={(e) => onChange({ ...block.props, subheading: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Background</label>
          <input
            type="color"
            className="mt-1 h-10 w-full rounded-lg border border-zinc-300"
            value={block.props.bgColor}
            onChange={(e) => onChange({ ...block.props, bgColor: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Text color</label>
          <input
            type="color"
            className="mt-1 h-10 w-full rounded-lg border border-zinc-300"
            value={block.props.textColor}
            onChange={(e) => onChange({ ...block.props, textColor: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}

function TextEditor({
  block,
  onChange,
}: {
  block: Block & { type: "text" };
  onChange: (props: Block["props"]) => void;
}) {
  return (
    <>
      <div>
        <label className={labelCls}>Content</label>
        <div className="mt-1">
          <RichTextEditor
            value={block.props.content}
            onChange={(v) => onChange({ ...block.props, content: v })}
            placeholder="Write your content…"
            showSource
          />
        </div>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">
          Format with the toolbar, add links, lists and headings, or paste from Word —
          it becomes clean HTML automatically.
        </p>
      </div>
      <div>
        <label className={labelCls}>Alignment</label>
        <select
          className={inputCls}
          value={block.props.align}
          onChange={(e) => onChange({ ...block.props, align: e.target.value as "left" })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
    </>
  );
}

function ImageEditor({
  block,
  onChange,
}: {
  block: Block & { type: "image" };
  onChange: (props: Block["props"]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Upload failed.");
      }
      onChange({ ...block.props, src: json.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div>
        <label className={labelCls}>Upload image</label>
        <input
          type="file"
          accept="image/*"
          className="mt-1 block w-full text-sm text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {uploading && <p className="mt-1 text-xs text-zinc-500">Uploading…</p>}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <div>
        <label className={labelCls}>Image URL</label>
        <input
          className={inputCls}
          value={block.props.src}
          onChange={(e) => onChange({ ...block.props, src: e.target.value })}
          placeholder="https://... or /api/assets/..."
        />
      </div>
      <div>
        <label className={labelCls}>Alt text</label>
        <input
          className={inputCls}
          value={block.props.alt}
          onChange={(e) => onChange({ ...block.props, alt: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>Caption</label>
        <input
          className={inputCls}
          value={block.props.caption}
          onChange={(e) => onChange({ ...block.props, caption: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>Width</label>
        <select
          className={inputCls}
          value={block.props.width}
          onChange={(e) => onChange({ ...block.props, width: e.target.value as "full" })}
        >
          <option value="full">Full</option>
          <option value="wide">Wide</option>
          <option value="narrow">Narrow</option>
        </select>
      </div>
    </>
  );
}

function CtaEditor({
  block,
  onChange,
}: {
  block: Block & { type: "cta" };
  onChange: (props: Block["props"]) => void;
}) {
  return (
    <>
      <div>
        <label className={labelCls}>Heading</label>
        <input
          className={inputCls}
          value={block.props.heading}
          onChange={(e) => onChange({ ...block.props, heading: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>Body</label>
        <div className="mt-1">
          <RichTextEditor
            value={block.props.body}
            onChange={(v) => onChange({ ...block.props, body: v })}
            minHeight={120}
            placeholder="Write a short description…"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Button text</label>
          <input
            className={inputCls}
            value={block.props.buttonText}
            onChange={(e) => onChange({ ...block.props, buttonText: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Button URL</label>
          <input
            className={inputCls}
            value={block.props.buttonUrl}
            onChange={(e) => onChange({ ...block.props, buttonUrl: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Background</label>
        <input
          type="color"
          className="mt-1 h-10 w-full rounded-lg border border-zinc-300"
          value={block.props.bgColor}
          onChange={(e) => onChange({ ...block.props, bgColor: e.target.value })}
        />
      </div>
    </>
  );
}

function FeaturesEditor({
  block,
  onChange,
}: {
  block: Block & { type: "features" };
  onChange: (props: Block["props"]) => void;
}) {
  const updateItem = (index: number, field: string, value: string) => {
    const items = [...block.props.items];
    items[index] = { ...items[index], [field]: value };
    onChange({ ...block.props, items });
  };

  const addItem = () => {
    onChange({
      ...block.props,
      items: [...block.props.items, { icon: "✓", title: "New Feature", description: "" }],
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...block.props,
      items: block.props.items.filter((_, i) => i !== index),
    });
  };

  return (
    <>
      <div>
        <label className={labelCls}>Heading</label>
        <input
          className={inputCls}
          value={block.props.heading}
          onChange={(e) => onChange({ ...block.props, heading: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>Columns</label>
        <select
          className={inputCls}
          value={block.props.columns}
          onChange={(e) =>
            onChange({ ...block.props, columns: Number(e.target.value) as 2 | 3 | 4 })
          }
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </div>
      <div className="space-y-3">
        <label className={labelCls}>Items</label>
        {block.props.items.map((item, i) => (
          <div key={i} className="rounded-lg border border-zinc-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">Item {i + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
            <input
              className={inputCls}
              value={item.icon}
              onChange={(e) => updateItem(i, "icon", e.target.value)}
              placeholder="Icon"
            />
            <input
              className={inputCls}
              value={item.title}
              onChange={(e) => updateItem(i, "title", e.target.value)}
              placeholder="Title"
            />
            <RichTextEditor
              value={item.description}
              onChange={(v) => updateItem(i, "description", v)}
              minHeight={80}
              placeholder="Description"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
        >
          + Add item
        </button>
      </div>
    </>
  );
}

function SpacerEditor({
  block,
  onChange,
}: {
  block: Block & { type: "spacer" };
  onChange: (props: Block["props"]) => void;
}) {
  return (
    <div>
      <label className={labelCls}>Height (px)</label>
      <input
        type="number"
        min={8}
        max={200}
        className={inputCls}
        value={block.props.height}
        onChange={(e) => onChange({ ...block.props, height: Number(e.target.value) })}
      />
    </div>
  );
}

function ButtonEditor({
  block,
  onChange,
}: {
  block: Block & { type: "button" };
  onChange: (props: Block["props"]) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Text</label>
          <input
            className={inputCls}
            value={block.props.text}
            onChange={(e) => onChange({ ...block.props, text: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>URL</label>
          <input
            className={inputCls}
            value={block.props.url}
            onChange={(e) => onChange({ ...block.props, url: e.target.value })}
            placeholder="https://… or /path"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Align</label>
          <select
            className={inputCls}
            value={block.props.align}
            onChange={(e) => onChange({ ...block.props, align: e.target.value as "left" })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Style</label>
          <select
            className={inputCls}
            value={block.props.variant}
            onChange={(e) => onChange({ ...block.props, variant: e.target.value as "solid" })}
          >
            <option value="solid">Solid</option>
            <option value="outline">Outline</option>
          </select>
        </div>
      </div>
    </>
  );
}

function EmbedEditor({
  block,
  onChange,
}: {
  block: Block & { type: "embed" };
  onChange: (props: Block["props"]) => void;
}) {
  return (
    <div>
      <label className={labelCls}>HTML / embed code</label>
      <textarea
        rows={6}
        className={`${inputCls} font-mono text-xs`}
        value={block.props.html}
        onChange={(e) => onChange({ ...block.props, html: e.target.value })}
        placeholder={'<iframe src="https://…"></iframe>'}
      />
      <p className="mt-1 text-[11px] leading-snug text-zinc-400">
        Paste raw HTML (YouTube, forms, maps, custom markup).
      </p>
    </div>
  );
}

function FaqEditor({
  block,
  onChange,
}: {
  block: Block & { type: "faq" };
  onChange: (props: Block["props"]) => void;
}) {
  const updateItem = (index: number, field: "question" | "answer", value: string) => {
    const items = [...block.props.items];
    items[index] = { ...items[index], [field]: value };
    onChange({ ...block.props, items });
  };

  const addItem = () => {
    onChange({
      ...block.props,
      items: [...block.props.items, { question: "", answer: "" }],
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...block.props,
      items: block.props.items.filter((_, i) => i !== index),
    });
  };

  return (
    <>
      <div>
        <label className={labelCls}>Heading</label>
        <input
          className={inputCls}
          value={block.props.heading}
          onChange={(e) => onChange({ ...block.props, heading: e.target.value })}
        />
      </div>
      <div className="space-y-3">
        <label className={labelCls}>Questions</label>
        {block.props.items.map((item, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-zinc-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">Question {i + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
            <input
              className={inputCls}
              value={item.question}
              onChange={(e) => updateItem(i, "question", e.target.value)}
              placeholder="Question"
            />
            <RichTextEditor
              value={item.answer}
              onChange={(v) => updateItem(i, "answer", v)}
              minHeight={96}
              placeholder="Answer"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
        >
          + Add question
        </button>
      </div>
    </>
  );
}

function TestimonialEditor({
  block,
  onChange,
}: {
  block: Block & { type: "testimonial" };
  onChange: (props: Block["props"]) => void;
}) {
  return (
    <>
      <div>
        <label className={labelCls}>Quote</label>
        <div className="mt-1">
          <RichTextEditor
            value={block.props.quote}
            onChange={(v) => onChange({ ...block.props, quote: v })}
            minHeight={110}
            placeholder="The customer’s words…"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Author</label>
          <input
            className={inputCls}
            value={block.props.author}
            onChange={(e) => onChange({ ...block.props, author: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Role</label>
          <input
            className={inputCls}
            value={block.props.role}
            onChange={(e) => onChange({ ...block.props, role: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Rating</label>
        <select
          className={inputCls}
          value={String(block.props.rating)}
          onChange={(e) =>
            onChange({ ...block.props, rating: Number(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5 })
          }
        >
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n) || "No stars"}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function DividerEditor() {
  return (
    <p className="text-xs text-zinc-400">No settings — this renders a horizontal line.</p>
  );
}

function RowEditor({
  block,
  onChange,
  onAddToColumn,
}: {
  block: RowBlock;
  onChange: (props: Block["props"]) => void;
  onAddToColumn?: (columnId: string, type: BlockType) => void;
}) {
  const updateColumns = (columns: ColumnData[]) => onChange({ ...block.props, columns });

  const addColumn = () => {
    if (block.props.columns.length >= 6) return;
    updateColumns([
      ...block.props.columns,
      { id: crypto.randomUUID(), span: 6, blocks: [] },
    ]);
  };

  const removeColumn = (id: string) => {
    if (block.props.columns.length <= 1) return;
    updateColumns(block.props.columns.filter((c) => c.id !== id));
  };

  const setColumn = (id: string, patch: Partial<ColumnData>) => {
    updateColumns(
      block.props.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  };

  return (
    <>
      <BackgroundFields
        label="Row background"
        color={block.props.bgColor}
        image={block.props.bgImage}
        onColor={(value) => onChange({ ...block.props, bgColor: value || undefined })}
        onImage={(value) => onChange({ ...block.props, bgImage: value })}
      />

      <div>
        <label className={labelCls}>Text color</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            className="h-10 w-12 rounded-lg border border-zinc-300"
            value={block.props.textColor || "#18181b"}
            onChange={(e) => onChange({ ...block.props, textColor: e.target.value })}
          />
          <input
            className={inputCls}
            value={block.props.textColor ?? ""}
            onChange={(e) => onChange({ ...block.props, textColor: e.target.value || undefined })}
            placeholder="Inherit from theme"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Vertical padding (px)</label>
          <input
            type="number"
            min={0}
            max={200}
            className={inputCls}
            value={block.props.paddingY ?? 24}
            onChange={(e) => onChange({ ...block.props, paddingY: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className={labelCls}>Full width</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id={`full-width-${block.id}`}
              type="checkbox"
              checked={!!block.props.fullWidth}
              onChange={(e) => onChange({ ...block.props, fullWidth: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
            />
            <label htmlFor={`full-width-${block.id}`} className="text-sm text-zinc-700">
              Edge-to-edge
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Gap (px)</label>
          <input
            type="number"
            min={0}
            max={64}
            className={inputCls}
            value={block.props.gap}
            onChange={(e) => onChange({ ...block.props, gap: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className={labelCls}>Vertical align</label>
          <select
            className={inputCls}
            value={block.props.align}
            onChange={(e) => onChange({ ...block.props, align: e.target.value as "stretch" })}
          >
            <option value="stretch">Stretch</option>
            <option value="start">Top</option>
            <option value="center">Middle</option>
            <option value="end">Bottom</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Default mobile layout</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id={`stack-mobile-${block.id}`}
            type="checkbox"
            checked={block.props.stackOnMobile}
            onChange={(e) => onChange({ ...block.props, stackOnMobile: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
          />
          <label htmlFor={`stack-mobile-${block.id}`} className="text-sm text-zinc-700">
            Stack columns to full width on mobile
          </label>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">
          This is the default for columns in “Auto” mobile mode. Set a column’s
          Mobile width below to override it per column.
        </p>
      </div>
      <div>
        <label className={labelCls}>Columns</label>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">
          Drag blocks between columns, or use “Add block” below a column. Click a column in the
          canvas to make the palette add into it.
        </p>
        <div className="mt-2 space-y-2">
          {block.props.columns.map((c, i) => (
            <div key={c.id} className="space-y-2 rounded-lg border border-zinc-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Column {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeColumn(c.id)}
                  disabled={block.props.columns.length <= 1}
                  className="text-xs text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
              <ResponsiveSpanFields
                desktop={c.span}
                tablet={c.spanMd}
                mobile={c.spanSm}
                onDesktop={(n) => setColumn(c.id, { span: n })}
                onTablet={(n) => setColumn(c.id, { spanMd: n })}
                onMobile={(n) => setColumn(c.id, { spanSm: n })}
              />
              <select
                className={inputCls}
                value=""
                onChange={(e) => {
                  const type = e.target.value as BlockType;
                  if (type && onAddToColumn) onAddToColumn(c.id, type);
                }}
              >
                <option value="" disabled>
                  + Add block…
                </option>
                {LEAF_BLOCK_TYPES.map((t) => {
                  const def = BLOCK_DEFINITIONS.find((d) => d.type === t);
                  return (
                    <option key={t} value={t}>
                      {def?.icon} {def?.label}
                    </option>
                  );
                })}
              </select>
              <BackgroundFields
                label={`Column ${i + 1} background`}
                color={c.bgColor}
                image={c.bgImage}
                onColor={(value) => setColumn(c.id, { bgColor: value || undefined })}
                onImage={(value) => setColumn(c.id, { bgImage: value })}
              />
              <p className="text-[10px] text-zinc-400">
                {c.blocks.length} block{c.blocks.length === 1 ? "" : "s"} inside
              </p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addColumn}
          disabled={block.props.columns.length >= 6}
          className="mt-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add column
        </button>
      </div>
    </>
  );
}

const EDITORS: Record<string, React.ComponentType<EditorProps>> = {
  hero: HeroEditor as React.ComponentType<EditorProps>,
  text: TextEditor as React.ComponentType<EditorProps>,
  image: ImageEditor as React.ComponentType<EditorProps>,
  cta: CtaEditor as React.ComponentType<EditorProps>,
  features: FeaturesEditor as React.ComponentType<EditorProps>,
  button: ButtonEditor as React.ComponentType<EditorProps>,
  embed: EmbedEditor as React.ComponentType<EditorProps>,
  faq: FaqEditor as React.ComponentType<EditorProps>,
  testimonial: TestimonialEditor as React.ComponentType<EditorProps>,
  spacer: SpacerEditor as React.ComponentType<EditorProps>,
  divider: DividerEditor as React.ComponentType<EditorProps>,
  row: RowEditor as React.ComponentType<EditorProps>,
};

export default function BlockEditor({
  block,
  onChange,
  onAddToColumn,
}: EditorProps) {
  const Editor = EDITORS[block.type];
  if (!Editor) return <p className="text-xs text-zinc-400">No editor for this block type.</p>;
  return <Editor block={block} onChange={onChange} onAddToColumn={onAddToColumn} />;
}