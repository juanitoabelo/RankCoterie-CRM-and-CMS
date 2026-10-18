"use client";

import { useState } from "react";
import { inputCls, labelCls } from "./settings";
import { useFontFamilyOptions } from "../CustomFontProvider";
import { FONT_FAMILY_PRESETS } from "@/lib/page-builder/style";
import type {
  BlockStyleSchema,
  StyleField,
  StyleElementSchema,
} from "@/lib/page-builder/element-style";
import {
  ELEMENT_DEVICES,
  type ElementBreakpointKey,
  type ElementBreakpoints,
  type ElementStyle,
  type ElementStyles,
} from "@/lib/page-builder/element-style";
import type { PaletteColor } from "@/lib/theme-colors";
import { useThemeColors } from "./ThemeColorsProvider";

export interface ElementStyleTabProps {
  /** Schema describing the block's styleable elements. */
  schema: BlockStyleSchema;
  /** Current `props.elementStyles` value. */
  value?: ElementStyles;
  /** Replace the whole elementStyles map. */
  onChange: (next: ElementStyles) => void;
  /** Optional global theme color palette (defaults to the provider). */
  themeColors?: PaletteColor[];
}

const FONT_WEIGHTS = ["300", "400", "500", "600", "700", "800", "900"];

/* ── Field controls ───────────────────────────────────────────────────────── */

function FieldInput({
  field,
  value,
  onChange,
  themeColors,
}: {
  field: StyleField;
  value: ElementStyle | undefined;
  onChange: (v: ElementStyle[keyof ElementStyle] | undefined) => void;
  themeColors?: PaletteColor[];
}) {
  const fontFamilies = useFontFamilyOptions(FONT_FAMILY_PRESETS.filter((p) => p.value));
  const current = value?.[field.key];

  if (field.kind === "align") {
    const options = [
      { value: "left", icon: "⫷" },
      { value: "center", icon: "⫶" },
      { value: "right", icon: "⫸" },
      { value: "justify", icon: "☰" },
    ];
    return (
      <div>
        <span className={labelCls}>{field.label}</span>
        <div className="mt-1 flex gap-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(current === opt.value ? undefined : opt.value)}
              className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${
                current === opt.value
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
              }`}
              title={opt.value}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.kind === "color") {
    const hex = typeof current === "string" && current ? current : "#000000";
    return (
      <div>
        <span className={labelCls}>{field.label}</span>
        <div className="mt-1 flex items-center gap-1.5">
          <input
            type="color"
            className="h-8 w-9 shrink-0 rounded border border-zinc-300"
            value={hex}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            className={`${inputCls} mt-0 min-w-0 flex-1`}
            value={typeof current === "string" ? current : ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            placeholder="#000000"
          />
          <button
            type="button"
            title="Clear (inherit)"
            onClick={() => onChange(undefined)}
            className="h-8 shrink-0 rounded border border-zinc-200 px-1.5 text-[10px] text-zinc-400 hover:bg-zinc-50"
          >
            ✕
          </button>
        </div>
        {themeColors && themeColors.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {themeColors.map((c) => (
              <button
                key={c.key}
                type="button"
                title={c.label}
                onClick={() => onChange(c.color)}
                className={`h-5 w-5 rounded-full border ${
                  current === c.color ? "border-zinc-900 ring-1 ring-zinc-900" : "border-black/10"
                }`}
                style={{ backgroundColor: c.color }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (field.kind === "number") {
    const unitSuffix = field.key === "fontSize" || field.key === "letterSpacing" || field.key === "lineHeight" || field.key === "opacity" ? "" : "px";
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className={labelCls}>{field.label}</span>
          {unitSuffix && <span className="text-[10px] text-zinc-400">px</span>}
        </div>
        <input
          type="number"
          className={inputCls}
          value={current !== undefined && current !== null ? String(current) : ""}
          min={field.min}
          max={field.max}
          step={field.step}
          placeholder="Auto"
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      </div>
    );
  }

  if (field.kind === "select") {
    return (
      <div>
        <span className={labelCls}>{field.label}</span>
        <select
          className={inputCls}
          value={typeof current === "string" ? current : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">Default</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.kind === "font") {
    const stack = typeof current === "string" ? current : "";
    return (
      <div>
        <span className={labelCls}>{field.label}</span>
        <select
          className={inputCls}
          value={fontFamilies.some((f) => f.value === stack) ? stack : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">Inherit</option>
          {fontFamilies.map((f) => (
            <option key={f.value} value={f.value} style={f.custom ? { fontFamily: f.value } : undefined}>
              {f.label}
            </option>
          ))}
        </select>
        <input
          className={`${inputCls} mt-1`}
          value={stack}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="…or custom font stack (CSS)"
        />
      </div>
    );
  }

  if (field.kind === "weight") {
    return (
      <div>
        <span className={labelCls}>{field.label}</span>
        <select
          className={inputCls}
          value={typeof current === "string" ? current : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">Default</option>
          {FONT_WEIGHTS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // text
  return (
    <div>
      <span className={labelCls}>{field.label}</span>
      <input
        className={inputCls}
        value={typeof current === "string" ? current : ""}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </div>
  );
}

/* ── Element section (collapsible) ────────────────────────────────────────── */

function ElementSection({
  element,
  value,
  onPatch,
  themeColors,
}: {
  element: StyleElementSchema;
  value: ElementBreakpointStyles | undefined;
  onPatch: (next: ElementBreakpointStyles | undefined) => void;
  themeColors?: PaletteColor[];
}) {
  const bpValue = value;
  const activeCount = bpValue ? Object.keys(bpValue).length : 0;

  const setField = (key: StyleField["key"], v: ElementStyle[keyof ElementStyle] | undefined) => {
    const next: ElementStyle = { ...(bpValue as ElementStyle) };
    if (v === undefined || v === "" || v === null) {
      delete next[key];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (next as any)[key] = v;
    }
    const empty = Object.keys(next).length === 0;
    onPatch(empty ? undefined : next);
  };

  return (
    <details className="rounded-lg border border-zinc-200 bg-white" open={activeCount > 0}>
      <summary className="flex cursor-pointer items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold text-zinc-700">{element.label}</span>
        <span className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
              {activeCount}
            </span>
          )}
          <span className="text-zinc-300">▾</span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-zinc-100 p-3">
        {element.description && (
          <p className="text-[11px] leading-snug text-zinc-400">{element.description}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {element.fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={bpValue}
              onChange={(v) => setField(field.key, v)}
              themeColors={themeColors}
            />
          ))}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onPatch(undefined)}
            className="text-[11px] text-zinc-400 hover:text-red-500"
          >
            Reset {element.label.toLowerCase()}
          </button>
        )}
      </div>
    </details>
  );
}

type ElementBreakpointStyles = ElementStyle;

/* ── Main tab ─────────────────────────────────────────────────────────────── */

export default function ElementStyleTab({ schema, value, onChange, themeColors }: ElementStyleTabProps) {
  const [device, setDevice] = useState<ElementBreakpointKey>("mobile");
  const providerColors = useThemeColors();
  const palette = themeColors ?? providerColors;

  const patchElement = (elementKey: string, next: ElementStyle | undefined) => {
    const map: ElementStyles = { ...(value ?? {}) };
    const bp: ElementBreakpoints = { ...(map[elementKey] ?? {}) };
    if (next) bp[device] = next;
    else delete bp[device];

    const hasAny = Object.values(bp).some((s) => s && Object.keys(s).length > 0);
    if (hasAny) map[elementKey] = bp;
    else delete map[elementKey];
    onChange(map);
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-[11px] leading-snug text-zinc-500">
          Style individual parts of <span className="font-semibold text-zinc-700">{schema.blockLabel}</span>.
          Choose a device, then open a part to style only that part.
        </p>
        <div className="flex rounded-lg border border-zinc-200 p-0.5">
          {ELEMENT_DEVICES.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDevice(d.key)}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition ${
                device === d.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {schema.elements.map((element) => (
          <ElementSection
            key={element.key}
            element={element}
            value={value?.[element.key]?.[device]}
            onPatch={(next) => patchElement(element.key, next)}
            themeColors={palette}
          />
        ))}
      </div>
    </div>
  );
}
