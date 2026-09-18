"use client";

import { useState } from "react";
import { FULL_COLUMN_SPANS } from "@/lib/page-builder/types";
import type { StyleBreakpoints, TypographyStyle } from "@/lib/page-builder/types";
import { FONT_FAMILY_PRESETS, STYLE_BREAKPOINTS } from "@/lib/page-builder/style";
import MediaLibraryPicker from "./MediaLibraryPicker";
import GlobalColorPicker from "../header-footer-builder/GlobalColorPicker";

export const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
export const labelCls = "block text-sm font-medium text-zinc-800";

export const SIZE_UNITS = ["px", "%", "rem", "em", "pt", "vw", "vh"] as const;
export type SizeUnit = typeof SIZE_UNITS[number];

export type SizeValue = {
  value: number;
  unit: SizeUnit;
};

/**
 * Reusable size input with unit selector. Supports px, %, rem, em, pt, vw, vh.
 */
export function SizeInput({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  allowAuto = false,
  showSlider = true,
}: {
  label: string;
  value: SizeValue | number | undefined;
  onChange: (v: SizeValue) => void;
  min?: number;
  max?: number;
  allowAuto?: boolean;
  showSlider?: boolean;
}) {
  const currentValue = typeof value === "object" && value !== null ? value : { value: typeof value === "number" ? value : 0, unit: "px" as SizeUnit };

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className={labelCls}>{label}</span>
        <div className="flex items-center gap-1">
          <select
            value={currentValue.unit}
            onChange={(e) => onChange({ ...currentValue, unit: e.target.value as SizeUnit })}
            className="h-6 w-14 rounded border border-zinc-300 px-1 text-[10px]"
          >
            {SIZE_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>
      {showSlider && (
        <div className="mt-1 flex items-center gap-2">
          <input
            type="range"
            min={min}
            max={max}
            className="h-1 flex-1 accent-zinc-900"
            value={currentValue.value}
            onChange={(e) => onChange({ ...currentValue, value: Number(e.target.value) })}
          />
          <input
            type="number"
            min={min}
            max={max}
            className="w-14 rounded border border-zinc-300 px-2 py-1 text-right text-xs"
            value={currentValue.value}
            onChange={(e) => onChange({ ...currentValue, value: Number(e.target.value) || 0 })}
          />
        </div>
      )}
      {!showSlider && (
        <input
          type="number"
          min={min}
          max={max}
          className={inputCls}
          value={currentValue.value}
          onChange={(e) => onChange({ ...currentValue, value: Number(e.target.value) || 0 })}
        />
      )}
    </div>
  );
}

/**
 * Converts a SizeValue to a CSS string like "100px", "50%", "1.5rem", etc.
 */
export function sizeToCss(v: SizeValue | number | undefined, fallback?: string): string | undefined {
  if (v === undefined || v === null) return fallback;
  if (typeof v === "number") return `${v}px`;
  if (v.value === 0) return fallback;
  return `${v.value}${v.unit}`;
}

/**
 * Parses a CSS string like "100px", "50%", "1.5rem" into a SizeValue.
 */
export function parseSizeValue(s: string | undefined, defaultUnit: SizeUnit = "px"): SizeValue {
  if (!s) return { value: 0, unit: defaultUnit };
  const match = s.match(/^([\d.]+)(px|%|rem|em|pt|vw|vh)?$/);
  if (!match) return { value: 0, unit: defaultUnit };
  return {
    value: parseFloat(match[1]),
    unit: (match[2] as SizeUnit) || defaultUnit,
  };
}

export type SpacingValues = { top: number; right: number; bottom: number; left: number };

/**
 * Spacing input with T/R/B/L fields and optional link toggle.
 */
export function SpacingInput({
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

export type SpanFieldConfig = "desktop" | "tablet" | "mobile";

const SPAN_DEVICES: Array<{
  key: SpanFieldConfig;
  label: string;
  icon: string;
  allowAuto: boolean;
}> = [
  { key: "desktop", label: "Desktop", icon: "🖥", allowAuto: false },
  { key: "tablet", label: "Tablet", icon: "💻", allowAuto: true },
  { key: "mobile", label: "Mobile", icon: "📱", allowAuto: true },
];

/**
 * Elementor-style responsive column width control. Lets the user pick a width
 * (1–12 of 12) for each of Desktop / Tablet / Mobile. Tablet and Mobile also
 * support "Auto" (inherit the desktop span / the row's stack-on-mobile default).
 */
export function ResponsiveSpanFields({
  desktop,
  tablet,
  mobile,
  onDesktop,
  onTablet,
  onMobile,
}: {
  desktop: number;
  tablet?: number;
  mobile?: number;
  onDesktop: (span: number) => void;
  onTablet: (span: number | undefined) => void;
  onMobile: (span: number | undefined) => void;
}) {
  const values: Record<SpanFieldConfig, number | undefined> = {
    desktop,
    tablet,
    mobile,
  };
  const setters: Record<SpanFieldConfig, (v: number | undefined) => void> = {
    desktop: (v) => onDesktop(v ?? 6),
    tablet: onTablet,
    mobile: onMobile,
  };

  const isCustom =
    (tablet !== undefined && tablet !== desktop) ||
    (mobile !== undefined && mobile !== desktop);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {SPAN_DEVICES.map((device) => {
          const value = values[device.key] ?? "";
          return (
            <div key={device.key}>
              <span className="block text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                {device.icon} {device.label}
              </span>
              <select
                className={`${inputCls} mt-0.5`}
                value={String(value)}
                onChange={(e) =>
                  setters[device.key](
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              >
                {device.allowAuto && <option value="">Auto</option>}
                {FULL_COLUMN_SPANS.map((s) => (
                  <option key={s} value={s}>
                    {s}/12
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-zinc-400">
        {isCustom ? (
          <>
            Resolution: {mobile ?? "auto"}/12 mobile · {tablet ?? "auto"}/12 tablet ·{" "}
            {desktop}/12 desktop.
          </>
        ) : (
          <>
            {desktop}/12 on every device. Set Tablet / Mobile to Auto to fall back to
            this width (and the row’s stack rule on mobile).
          </>
        )}
      </p>
    </div>
  );
}

export function BackgroundFields({
  label = "Background",
  color,
  image,
  bgPosition,
  bgSize,
  bgRepeat,
  onColor,
  onImage,
  onBgPosition,
  onBgSize,
  onBgRepeat,
  themeColors,
  showOverlay,
  overlayColor,
  overlayOpacity,
  onOverlayColor,
  onOverlayOpacity,
}: {
  label?: string;
  color?: string;
  image?: string;
  bgPosition?: string;
  bgSize?: string;
  bgRepeat?: string;
  onColor: (value: string) => void;
  onImage: (value: string) => void;
  onBgPosition?: (value: string) => void;
  onBgSize?: (value: string) => void;
  onBgRepeat?: (value: string) => void;
  themeColors?: Array<{ key: string; label: string; color: string }>;
  showOverlay?: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  onOverlayColor?: (value: string) => void;
  onOverlayOpacity?: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      {themeColors ? (
        <GlobalColorPicker
          label={`${label} Color`}
          value={color}
          onChange={onColor}
          allowClear
          paletteOverride={themeColors}
        />
      ) : (
        <div>
          <label className={labelCls}>{label} color</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              className="h-10 w-12 rounded-lg border border-zinc-300"
              value={color || "#ffffff"}
              onChange={(e) => onColor(e.target.value)}
            />
            <input
              className={inputCls}
              value={color ?? ""}
              onChange={(e) => onColor(e.target.value)}
              placeholder="No background color"
            />
          </div>
          {color && (
            <button
              type="button"
              onClick={() => onColor("")}
              className="mt-1 text-[11px] text-zinc-400 underline underline-offset-2 hover:text-zinc-600"
            >
              Clear color
            </button>
          )}
        </div>
      )}

      <MediaLibraryPicker
        value={image || ""}
        onChange={onImage}
        label={`${label} image`}
      />

      {image && onBgPosition && onBgSize && onBgRepeat && (
        <>
          <label className={labelCls}>Position
            <select
              className={inputCls}
              value={bgPosition || "center center"}
              onChange={(e) => onBgPosition(e.target.value)}
            >
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
          </label>
          <label className={labelCls}>Size
            <select
              className={inputCls}
              value={bgSize || "cover"}
              onChange={(e) => onBgSize(e.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="100% 100%">Stretch</option>
            </select>
          </label>
          <label className={labelCls}>Repeat
            <select
              className={inputCls}
              value={bgRepeat || "no-repeat"}
              onChange={(e) => onBgRepeat(e.target.value)}
            >
              <option value="repeat">Repeat</option>
              <option value="no-repeat">No Repeat</option>
              <option value="repeat-x">Repeat X</option>
              <option value="repeat-y">Repeat Y</option>
            </select>
          </label>
        </>
      )}

      {showOverlay && image && onOverlayColor && onOverlayOpacity && (
        <div className="space-y-2">
          <span className={labelCls}>Overlay</span>
          <div className="grid grid-cols-2 gap-2">
            <GlobalColorPicker
              label="Color"
              value={overlayColor || "#000000"}
              onChange={onOverlayColor}
              paletteOverride={themeColors}
            />
            <div>
              <label className={labelCls}>Opacity</label>
              <input
                type="range"
                min={0}
                max={100}
                value={overlayOpacity ?? 50}
                onChange={(e) => onOverlayOpacity(Number(e.target.value))}
                className="mt-1 w-full"
              />
              <span className="text-xs text-zinc-500">{overlayOpacity ?? 50}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Elementor-style "style guide" for text blocks: per-breakpoint color, font
 * family, and font size. Each breakpoint (mobile / sm / md / lg) can override
 * independently; empty fields inherit the block's default styling.
 */
export function StyleGuideEditor({
  style,
  onChange,
}: {
  style?: StyleBreakpoints;
  onChange: (style: StyleBreakpoints) => void;
}) {
  const current: StyleBreakpoints = style ?? {};

  const setBreakpoint = (key: keyof StyleBreakpoints, patch: Partial<TypographyStyle>) => {
    const merged = { ...current[key], ...patch } as TypographyStyle;
    // Drop a breakpoint when every field is cleared so it falls through.
    if (!merged.color && !merged.fontFamily && !merged.fontSize) {
      const { [key]: _omit, ...rest } = current;
      onChange(rest);
      return;
    }
    onChange({ ...current, [key]: merged });
  };

  const fontValue = (key: keyof StyleBreakpoints) => current[key]?.fontFamily ?? "";

  const FONT_SIZE_UNITS: Array<{ value: string; label: string }> = [
    { value: "px", label: "px" },
    { value: "em", label: "em" },
    { value: "rem", label: "rem" },
    { value: "%", label: "%" },
  ];

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
      <p className="text-[11px] leading-snug text-zinc-400">
        Typography style guide. Set text color, font family, and size per device
        size; leave blank to inherit the block’s default look.
      </p>
      {STYLE_BREAKPOINTS.map((bp) => {
        const value = current[bp.key] ?? {};
        return (
          <div key={bp.key} className="rounded-lg border border-zinc-100 p-2.5">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              {bp.label}
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-zinc-500">Color</label>
                <input
                  type="color"
                  className="mt-0.5 h-8 w-full rounded border border-zinc-300"
                  value={value.color ?? "#000000"}
                  onChange={(e) => setBreakpoint(bp.key, { color: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500">Font</label>
                <select
                  className={`${inputCls} mt-0.5`}
                  value={fontValue(bp.key)}
                  onChange={(e) => setBreakpoint(bp.key, { fontFamily: e.target.value })}
                >
                  <option value="">Inherit</option>
                  {FONT_FAMILY_PRESETS.filter((p) => p.value).map((p) => (
                    <option key={p.key} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500">Size</label>
                <div className="mt-0.5 flex items-stretch gap-1">
                  <input
                    type="number"
                    min={1}
                    max={999}
                    className={`${inputCls} mt-0 min-w-0 flex-1`}
                    value={value.fontSize ?? ""}
                    onChange={(e) =>
                      setBreakpoint(bp.key, {
                        fontSize: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                  <select
                    className={`${inputCls} mt-0 w-16 shrink-0`}
                    value={value.fontSizeUnit ?? "px"}
                    onChange={(e) =>
                      setBreakpoint(bp.key, {
                        fontSizeUnit: e.target.value as TypographyStyle["fontSizeUnit"],
                      })
                    }
                  >
                    {FONT_SIZE_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <input
              className={`${inputCls}`}
              value={current[bp.key]?.fontFamily ?? ""}
              onChange={(e) => setBreakpoint(bp.key, { fontFamily: e.target.value })}
              placeholder="…or custom font stack (CSS)"
            />
          </div>
        );
      })}
    </div>
  );
}
