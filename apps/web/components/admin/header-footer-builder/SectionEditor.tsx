"use client";

import { useState } from "react";
import type { SectionBlock } from "@/lib/page-builder/types";
import type { SpacingValues } from "@/lib/header-footer/types";
import { DEFAULT_SECTION_LAYOUT, DEFAULT_STYLE_SETTINGS, DEFAULT_ADVANCED_SETTINGS } from "@/lib/header-footer/types";
import GlobalColorPicker from "./GlobalColorPicker";
import BuilderImageUploader from "./BuilderImageUploader";

type Props = {
  block: SectionBlock;
  onChange: (props: SectionBlock["props"]) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onAddRow: () => void;
  themeColors?: Array<{ key: string; label: string; color: string }>;
};

const inputCls = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-xs font-medium text-zinc-600";

function iconBtn(active: boolean) {
  return `flex h-8 w-8 items-center justify-center rounded border text-sm ${
    active
      ? "border-zinc-900 bg-zinc-900 text-white"
      : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
  }`;
}

function NumberSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 2000,
  suffix = "px",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className={labelCls}>{label}</span>
        <div className="flex items-center gap-2">
          <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-1 w-20 accent-zinc-900" />
          <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} min={min} max={max} className="w-14 rounded border border-zinc-300 px-2 py-1 text-right text-xs" />
          <span className="text-[10px] text-zinc-400">{suffix}</span>
        </div>
      </div>
    </div>
  );
}

function SpacingInput({
  label,
  value,
  onChange,
  linked,
  onToggleLinked,
}: {
  label: string;
  value: SpacingValues;
  onChange: (v: SpacingValues) => void;
  linked: boolean;
  onToggleLinked: () => void;
}) {
  const set = (key: keyof SpacingValues, val: number) => {
    if (linked) onChange({ top: val, right: val, bottom: val, left: val });
    else onChange({ ...value, [key]: val });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className={labelCls}>{label}</span>
        <button type="button" onClick={onToggleLinked} className="text-zinc-400 hover:text-zinc-600" title={linked ? "Unlink" : "Link all"}>
          {linked ? "🔗" : "⛓️‍💥"}
        </button>
      </div>
      <div className="mt-1 grid grid-cols-4 gap-1">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <input key={side} type="number" value={value[side]} onChange={(e) => set(side, Number(e.target.value) || 0)} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" placeholder={side[0].toUpperCase()} />
        ))}
      </div>
      <div className="mt-0.5 flex justify-between px-1">
        {["T", "R", "B", "L"].map((l) => (
          <span key={l} className="text-[9px] text-zinc-400">{l}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Layout Tab ────────────────────────────────────────────────────────── */

function LayoutTab({ block, onChange }: { block: SectionBlock; onChange: (p: SectionBlock["props"]) => void }) {
  const p = block.props;
  const set = (patch: Record<string, unknown>) => onChange({ ...p, ...patch });

  return (
    <div className="space-y-4">
      <div>
        <span className={labelCls}>Content Width</span>
        <div className="mt-1 flex gap-1">
          <button type="button" onClick={() => set({ width: "full" })} className={iconBtn((p.width ?? DEFAULT_SECTION_LAYOUT.width) === "full")} title="Full Width">↔</button>
          <button type="button" onClick={() => set({ width: "boxed" })} className={iconBtn((p.width ?? DEFAULT_SECTION_LAYOUT.width) === "boxed")} title="Boxed">▣</button>
        </div>
      </div>

      {(p.width ?? DEFAULT_SECTION_LAYOUT.width) === "boxed" && (
        <NumberSlider label="Max Width" value={p.maxWidth ?? DEFAULT_SECTION_LAYOUT.maxWidth} onChange={(v) => set({ maxWidth: v })} min={400} max={1920} />
      )}

      <NumberSlider label="Min Height" value={p.minHeight ?? DEFAULT_SECTION_LAYOUT.minHeight} onChange={(v) => set({ minHeight: v })} min={0} max={800} />

      <div>
        <span className={labelCls}>Direction</span>
        <div className="mt-1 flex gap-1">
          <button type="button" onClick={() => set({ direction: "row" })} className={iconBtn((p.direction ?? DEFAULT_SECTION_LAYOUT.direction) === "row")} title="Row">→</button>
          <button type="button" onClick={() => set({ direction: "column" })} className={iconBtn((p.direction ?? DEFAULT_SECTION_LAYOUT.direction) === "column")} title="Column">↓</button>
        </div>
      </div>

      <div>
        <span className={labelCls}>Justify Content</span>
        <div className="mt-1 flex gap-1 flex-wrap">
          {[
            { value: "flex-start", icon: "⇤", label: "Start" },
            { value: "center", icon: "⇔", label: "Center" },
            { value: "flex-end", icon: "⇥", label: "End" },
            { value: "space-between", icon: "⟷", label: "Between" },
            { value: "space-around", icon: "⟺", label: "Around" },
            { value: "space-evenly", icon: "⟺", label: "Evenly" },
          ].map((opt) => (
            <button key={opt.value} type="button" onClick={() => set({ justifyContent: opt.value })} className={iconBtn((p.justifyContent ?? DEFAULT_SECTION_LAYOUT.justifyContent) === opt.value)} title={opt.label}>{opt.icon}</button>
          ))}
        </div>
      </div>

      <div>
        <span className={labelCls}>Align Items</span>
        <div className="mt-1 flex gap-1">
          {[
            { value: "stretch", icon: "⇕", label: "Stretch" },
            { value: "flex-start", icon: "⇖", label: "Start" },
            { value: "center", icon: "⇔", label: "Center" },
            { value: "flex-end", icon: "⇘", label: "End" },
          ].map((opt) => (
            <button key={opt.value} type="button" onClick={() => set({ alignItems: opt.value })} className={iconBtn((p.alignItems ?? DEFAULT_SECTION_LAYOUT.alignItems) === opt.value)} title={opt.label}>{opt.icon}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberSlider label="Column Gap" value={p.gapCol ?? DEFAULT_SECTION_LAYOUT.gapCol} onChange={(v) => set({ gapCol: v })} max={200} />
        <NumberSlider label="Row Gap" value={p.gapRow ?? DEFAULT_SECTION_LAYOUT.gapRow} onChange={(v) => set({ gapRow: v })} max={200} />
      </div>

      <div>
        <span className={labelCls}>Wrap</span>
        <div className="mt-1 flex gap-1">
          <button type="button" onClick={() => set({ wrap: "nowrap" })} className={iconBtn((p.wrap ?? DEFAULT_SECTION_LAYOUT.wrap) === "nowrap")} title="No Wrap">Sizer</button>
          <button type="button" onClick={() => set({ wrap: "wrap" })} className={iconBtn((p.wrap ?? DEFAULT_SECTION_LAYOUT.wrap) === "wrap")} title="Wrap">Wrap</button>
        </div>
      </div>
    </div>
  );
}

/* ── Style Tab ─────────────────────────────────────────────────────────── */

function StyleTab({ block, onChange, themeColors }: { block: SectionBlock; onChange: (p: SectionBlock["props"]) => void; themeColors?: Array<{ key: string; label: string; color: string }> }) {
  const p = block.props;
  const set = (patch: Record<string, unknown>) => onChange({ ...p, ...patch });

  return (
    <div className="space-y-4">
      <GlobalColorPicker label="Background Color" value={p.bgColor} onChange={(c) => set({ bgColor: c || undefined })} allowClear paletteOverride={themeColors} />

      <BuilderImageUploader label="Background Image" value={p.bgImage || ""} onChange={(url) => set({ bgImage: url || undefined })} />

      {p.bgImage && (
        <>
          <div>
            <span className={labelCls}>Background Position</span>
            <select value={p.bgPosition || "center center"} onChange={(e) => set({ bgPosition: e.target.value })} className={inputCls}>
              <option value="left top">Left Top</option>
              <option value="center top">Center Top</option>
              <option value="right top">Right Top</option>
              <option value="left center">Left Center</option>
              <option value="center center">Center Center</option>
              <option value="right center">Right Center</option>
              <option value="left bottom">Left Bottom</option>
              <option value="center bottom">Center Bottom</option>
              <option value="right bottom">Right Bottom</option>
            </select>
          </div>
          <div>
            <span className={labelCls}>Background Size</span>
            <select value={p.bgSize || "cover"} onChange={(e) => set({ bgSize: e.target.value })} className={inputCls}>
              <option value="auto">Auto</option>
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
            </select>
          </div>
          <div>
            <span className={labelCls}>Background Repeat</span>
            <select value={p.bgRepeat || "no-repeat"} onChange={(e) => set({ bgRepeat: e.target.value })} className={inputCls}>
              <option value="repeat">Repeat</option>
              <option value="no-repeat">No Repeat</option>
              <option value="repeat-x">Repeat X</option>
              <option value="repeat-y">Repeat Y</option>
            </select>
          </div>
        </>
      )}

      {p.bgImage && (
        <div className="border-t border-zinc-200 pt-4">
          <GlobalColorPicker label="Overlay Color" value={p.overlayColor} onChange={(c) => set({ overlayColor: c || undefined })} paletteOverride={themeColors} />
          <div className="mt-3">
            <NumberSlider label="Overlay Opacity" value={p.overlayOpacity || 0} onChange={(v) => set({ overlayOpacity: v })} min={0} max={100} suffix="%" />
          </div>
        </div>
      )}

      <div className="border-t border-zinc-200 pt-4">
        <span className={labelCls}>Border Style</span>
        <select value={p.borderStyle ?? "none"} onChange={(e) => set({ borderStyle: e.target.value })} className={inputCls}>
          <option value="none">None</option>
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>

      {(p.borderStyle ?? "none") !== "none" && (
        <>
          <NumberSlider label="Border Width" value={p.borderWidth ?? 0} onChange={(v) => set({ borderWidth: v })} max={20} />
          <GlobalColorPicker label="Border Color" value={p.borderColor} onChange={(c) => set({ borderColor: c })} paletteOverride={themeColors} />
        </>
      )}

      <NumberSlider label="Border Radius" value={p.borderRadius ?? 0} onChange={(v) => set({ borderRadius: v })} max={100} />

      <div>
        <span className={labelCls}>Box Shadow</span>
        <select value={p.boxShadow ?? ""} onChange={(e) => set({ boxShadow: e.target.value || undefined })} className={inputCls}>
          <option value="">None</option>
          <option value="0 1px 3px rgba(0,0,0,0.12)">Subtle</option>
          <option value="0 4px 6px rgba(0,0,0,0.1)">Medium</option>
          <option value="0 10px 15px rgba(0,0,0,0.1)">Large</option>
          <option value="0 20px 25px rgba(0,0,0,0.15)">Extra Large</option>
          <option value="inset 0 2px 4px rgba(0,0,0,0.06)">Inset</option>
        </select>
      </div>
    </div>
  );
}

/* ── Advanced Tab ──────────────────────────────────────────────────────── */

function AdvancedTab({ block, onChange }: { block: SectionBlock; onChange: (p: SectionBlock["props"]) => void }) {
  const [marginLinked, setMarginLinked] = useState(true);
  const [paddingLinked, setPaddingLinked] = useState(true);
  const p = block.props;

  const margin: SpacingValues = p.margin ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const padding: SpacingValues = p.padding ?? {
    top: p.paddingTop ?? 0,
    right: 0,
    bottom: p.paddingBottom ?? 0,
    left: 0,
  };

  return (
    <div className="space-y-4">
      <SpacingInput label="Margin" value={margin} onChange={(v) => onChange({ ...p, margin: v })} linked={marginLinked} onToggleLinked={() => setMarginLinked(!marginLinked)} />
      <SpacingInput label="Padding" value={padding} onChange={(v) => onChange({ ...p, padding: v, paddingTop: v.top, paddingBottom: v.bottom })} linked={paddingLinked} onToggleLinked={() => setPaddingLinked(!paddingLinked)} />

      <div className="border-t border-zinc-200 pt-4">
        <NumberSlider label="Z-Index" value={p.zindex ?? 0} onChange={(v) => onChange({ ...p, zindex: v })} min={0} max={9999} suffix="" />
      </div>

      <div>
        <span className={labelCls}>CSS ID</span>
        <input type="text" value={p.cssId ?? ""} onChange={(e) => onChange({ ...p, cssId: e.target.value })} placeholder="my-section" className={inputCls} />
      </div>

      <div>
        <span className={labelCls}>CSS Classes</span>
        <input type="text" value={p.cssClasses ?? ""} onChange={(e) => onChange({ ...p, cssClasses: e.target.value })} placeholder="custom-class" className={inputCls} />
      </div>
    </div>
  );
}

/* ── Main SectionEditor ──────────────────────────────────────────────────── */

type Tab = "layout" | "style" | "advanced";

export default function SectionEditor({ block, onChange, onRemove, onDuplicate, onAddRow, themeColors }: Props) {
  const [tab, setTab] = useState<Tab>("layout");

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "layout", label: "Layout" },
    { id: "style", label: "Style" },
    { id: "advanced", label: "Advanced" },
  ];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Section
        </h3>
        <div className="flex gap-1">
          <button onClick={onDuplicate} className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-100" title="Duplicate">⧉</button>
          <button onClick={onRemove} className="rounded px-2 py-1 text-[10px] text-red-500 hover:bg-red-50" title="Remove">✕</button>
        </div>
      </div>

      <div className="flex border-b border-zinc-200">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-2 text-xs font-medium ${tab === t.id ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "layout" && <LayoutTab block={block} onChange={onChange} />}
        {tab === "style" && <StyleTab block={block} onChange={onChange} themeColors={themeColors} />}
        {tab === "advanced" && <AdvancedTab block={block} onChange={onChange} />}
      </div>

      <div className="border-t border-zinc-200 px-4 py-3">
        <button onClick={onAddRow} className="w-full rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50">
          + Add Row
        </button>
      </div>
    </div>
  );
}
