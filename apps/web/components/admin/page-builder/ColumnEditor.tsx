"use client";

import { useState } from "react";
import { type ColumnData } from "@/lib/page-builder/types";
import {
  BackgroundFields,
  inputCls,
  labelCls,
  ResponsiveSpanFields,
  SpacingInput,
} from "./settings";
import type { SpacingValues } from "@/lib/spacing";
import type { PartialSpacing } from "@/lib/spacing";

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

/* ── Layout Tab ────────────────────────────────────────────────────────── */

function LayoutTab({ column, onChange }: { column: ColumnData; onChange: (patch: Partial<ColumnData>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Column width</label>
        <div className="mt-1">
          <ResponsiveSpanFields
            desktop={column.span}
            tablet={column.spanMd}
            mobile={column.spanSm}
            onDesktop={(span) => onChange({ span })}
            onTablet={(spanMd) => onChange({ spanMd })}
            onMobile={(spanSm) => onChange({ spanSm })}
          />
        </div>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">
          Widths are in a 12-column grid. Tablet/Mobile at &quot;Auto&quot; inherit the
          desktop width (and the row&apos;s mobile stack rule).
        </p>
      </div>

      <div className="border-t border-zinc-200 pt-4">
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
            <button key={opt.value} type="button" onClick={() => onChange({ justifyContent: opt.value as ColumnData["justifyContent"] })} className={iconBtn((column.justifyContent ?? "flex-start") === opt.value)} title={opt.label}>{opt.icon}</button>
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
            <button key={opt.value} type="button" onClick={() => onChange({ alignItems: opt.value as ColumnData["alignItems"] })} className={iconBtn((column.alignItems ?? "stretch") === opt.value)} title={opt.label}>{opt.icon}</button>
          ))}
        </div>
      </div>

      <NumberSlider label="Min Height" value={column.minHeight ?? 0} onChange={(minHeight) => onChange({ minHeight })} min={0} max={2000} />
    </div>
  );
}

/* ── Style Tab ─────────────────────────────────────────────────────────── */

function StyleTab({ column, onChange }: { column: ColumnData; onChange: (patch: Partial<ColumnData>) => void }) {
  return (
    <div className="space-y-4">
      <BackgroundFields
        label="Column"
        color={column.bgColor}
        image={column.bgImage}
        bgPosition={column.bgPosition}
        bgSize={column.bgSize}
        bgRepeat={column.bgRepeat}
        onColor={(value) => onChange({ bgColor: value || undefined })}
        onImage={(value) => onChange({ bgImage: value || undefined })}
        onBgPosition={(value) => onChange({ bgPosition: value })}
        onBgSize={(value) => onChange({ bgSize: value })}
        onBgRepeat={(value) => onChange({ bgRepeat: value })}
        showOverlay
        overlayColor={column.overlayColor}
        overlayOpacity={column.overlayOpacity}
        onOverlayColor={(value) => onChange({ overlayColor: value || undefined })}
        onOverlayOpacity={(value) => onChange({ overlayOpacity: value })}
      />

      <div className="border-t border-zinc-200 pt-4">
        <span className={labelCls}>Border Style</span>
        <select value={column.borderStyle ?? "none"} onChange={(e) => onChange({ borderStyle: e.target.value as ColumnData["borderStyle"] })} className={inputCls}>
          <option value="none">None</option>
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>

      {(column.borderStyle ?? "none") !== "none" && (
        <>
          <NumberSlider label="Border Width" value={column.borderWidth ?? 0} onChange={(borderWidth) => onChange({ borderWidth })} max={20} />
          <div>
            <label className={labelCls}>Border Color</label>
            <div className="mt-1 flex items-center gap-2">
              <input type="color" className="h-10 w-12 rounded-lg border border-zinc-300" value={column.borderColor || "#000000"} onChange={(e) => onChange({ borderColor: e.target.value })} />
              <input className={`${inputCls} mt-0`} value={column.borderColor ?? ""} onChange={(e) => onChange({ borderColor: e.target.value })} placeholder="No border color" />
            </div>
          </div>
        </>
      )}

      <NumberSlider label="Border Radius" value={column.borderRadius ?? 0} onChange={(borderRadius) => onChange({ borderRadius })} max={100} />

      <div>
        <span className={labelCls}>Box Shadow</span>
        <select value={column.boxShadow ?? ""} onChange={(e) => onChange({ boxShadow: e.target.value || undefined })} className={inputCls}>
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

function AdvancedTab({ column, onChange }: { column: ColumnData; onChange: (patch: Partial<ColumnData>) => void }) {
  const [marginLinked, setMarginLinked] = useState(true);
  const [paddingLinked, setPaddingLinked] = useState(true);

  const margin: PartialSpacing = column.margin ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const padding: PartialSpacing = column.padding ?? { top: 0, right: 0, bottom: 0, left: 0 };

  return (
    <div className="space-y-4">
      <SpacingInput label="Margin" value={margin} onChange={(v: SpacingValues) => onChange({ margin: v })} linked={marginLinked} onToggleLinked={() => setMarginLinked(!marginLinked)} />
      <SpacingInput label="Padding" value={padding} onChange={(v: SpacingValues) => onChange({ padding: v })} linked={paddingLinked} onToggleLinked={() => setPaddingLinked(!paddingLinked)} />

      <div className="border-t border-zinc-200 pt-4">
        <NumberSlider label="Z-Index" value={column.zindex ?? 0} onChange={(zindex) => onChange({ zindex })} min={0} max={9999} suffix="" />
      </div>

      <div>
        <span className={labelCls}>CSS ID</span>
        <input type="text" value={column.cssId ?? ""} onChange={(e) => onChange({ cssId: e.target.value })} placeholder="my-column" className={inputCls} />
      </div>

      <div>
        <span className={labelCls}>CSS Classes</span>
        <input type="text" value={column.cssClasses ?? ""} onChange={(e) => onChange({ cssClasses: e.target.value })} placeholder="custom-class" className={inputCls} />
      </div>
    </div>
  );
}

/* ── Main ColumnEditor ──────────────────────────────────────────────────── */

type Tab = "layout" | "style" | "advanced";

export default function ColumnEditor({
  column,
  onChange,
  onRemove,
  onDuplicate,
  canRemove,
  canDuplicate,
}: {
  column: ColumnData;
  onChange: (patch: Partial<ColumnData>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  canRemove: boolean;
  canDuplicate: boolean;
}) {
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
          Column · {column.span}/12
        </h3>
        <div className="flex gap-1">
          {canDuplicate && (
            <button onClick={onDuplicate} className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-100" title="Duplicate">⧉</button>
          )}
          {canRemove && (
            <button onClick={onRemove} className="rounded px-2 py-1 text-[10px] text-red-500 hover:bg-red-50" title="Remove">✕</button>
          )}
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
        {tab === "layout" && <LayoutTab column={column} onChange={onChange} />}
        {tab === "style" && <StyleTab column={column} onChange={onChange} />}
        {tab === "advanced" && <AdvancedTab column={column} onChange={onChange} />}
      </div>
    </div>
  );
}
