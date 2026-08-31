"use client";

import type { Block } from "@/lib/page-builder/types";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";

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
        <label className={labelCls}>Content (HTML)</label>
        <textarea
          rows={6}
          className={`${inputCls} font-mono text-xs`}
          value={block.props.content}
          onChange={(e) => onChange({ ...block.props, content: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>Alignment</label>
        <select
          className={inputCls}
          value={block.props.align}
          onChange={(e) => onChange({ ...block.props, align: e.target.value })}
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
  return (
    <>
      <div>
        <label className={labelCls}>Image URL</label>
        <input
          className={inputCls}
          value={block.props.src}
          onChange={(e) => onChange({ ...block.props, src: e.target.value })}
          placeholder="https://..."
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
          onChange={(e) => onChange({ ...block.props, width: e.target.value })}
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
        <textarea
          rows={3}
          className={inputCls}
          value={block.props.body}
          onChange={(e) => onChange({ ...block.props, body: e.target.value })}
        />
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
          onChange={(e) => onChange({ ...block.props, columns: Number(e.target.value) })}
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
            <input
              className={inputCls}
              value={item.description}
              onChange={(e) => updateItem(i, "description", e.target.value)}
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

function DividerEditor() {
  return (
    <p className="text-xs text-zinc-400">No settings — this renders a horizontal line.</p>
  );
}

const EDITORS: Record<string, React.ComponentType<{
  block: Block;
  onChange: (props: Block["props"]) => void;
}>> = {
  hero: HeroEditor,
  text: TextEditor,
  image: ImageEditor,
  cta: CtaEditor,
  features: FeaturesEditor,
  spacer: SpacerEditor,
  divider: DividerEditor,
};

export default function BlockEditor({
  block,
  onChange,
}: {
  block: Block;
  onChange: (props: Block["props"]) => void;
}) {
  const Editor = EDITORS[block.type];
  if (!Editor) return <p className="text-xs text-zinc-400">No editor for this block type.</p>;
  return <Editor block={block} onChange={onChange} />;
}
