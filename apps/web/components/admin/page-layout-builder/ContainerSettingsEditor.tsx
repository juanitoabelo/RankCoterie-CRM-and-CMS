"use client";

import { useState } from "react";
import type { ContainerSettings } from "@/lib/page-layout/types";
import { DEFAULT_CONTAINER_SETTINGS } from "@/lib/page-layout/types";
import GlobalColorPicker from "../header-footer-builder/GlobalColorPicker";
import BuilderImageUploader from "../header-footer-builder/BuilderImageUploader";

type Props = {
  settings: ContainerSettings;
  onChange: (settings: ContainerSettings) => void;
  themeColors?: Array<{ key: string; label: string; color: string }>;
};

const inputCls = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-xs font-medium text-zinc-600";
const iconBtnCls = (active: boolean) =>
  `flex h-8 w-8 items-center justify-center rounded border text-sm ${
    active
      ? "border-zinc-900 bg-zinc-900 text-white"
      : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
  }`;

function SpacingInput({
  label,
  value,
  onChange,
  linked,
  onToggleLinked,
}: {
  label: string;
  value: { top: number; right: number; bottom: number; left: number };
  onChange: (v: { top: number; right: number; bottom: number; left: number }) => void;
  linked: boolean;
  onToggleLinked: () => void;
}) {
  const set = (key: keyof typeof value, val: number) => {
    if (linked) {
      onChange({ top: val, right: val, bottom: val, left: val });
    } else {
      onChange({ ...value, [key]: val });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className={labelCls}>{label}</span>
        <button
          type="button"
          onClick={onToggleLinked}
          className="text-zinc-400 hover:text-zinc-600"
          title={linked ? "Unlink" : "Link all"}
        >
          {linked ? "🔗" : "⛓️‍💥"}
        </button>
      </div>
      <div className="mt-1 grid grid-cols-4 gap-1">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <input
            key={side}
            type="number"
            value={value[side]}
            onChange={(e) => set(side, Number(e.target.value) || 0)}
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-center text-xs"
            placeholder={side[0].toUpperCase()}
            title={side}
          />
        ))}
      </div>
      <div className="mt-0.5 flex justify-between px-1">
        <span className="text-[9px] text-zinc-400">T</span>
        <span className="text-[9px] text-zinc-400">R</span>
        <span className="text-[9px] text-zinc-400">B</span>
        <span className="text-[9px] text-zinc-400">L</span>
      </div>
    </div>
  );
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
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-1.5 flex-1 accent-zinc-900"
          />
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            className="w-16 rounded border border-zinc-300 px-2 py-1 text-center text-xs"
          />
          <span className="text-[10px] text-zinc-400">{suffix}</span>
        </div>
      </div>
    </div>
  );
}

export default function ContainerSettingsEditor({ settings, onChange, themeColors }: Props) {
  const [linkedMargin, setLinkedMargin] = useState(true);
  const [linkedPadding, setLinkedPadding] = useState(true);
  const [bgLinked, setBgLinked] = useState(false);

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
        Container
      </h3>

      {/* ── CANVAS / WIDTH ──────────────────────────────────────── */}
      <div className="space-y-2">
        <span className={labelCls}>Canvas</span>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ ...settings, width: "full" })}
            className={iconBtnCls(settings.width === "full")}
            title="Full Width (edge to edge)"
          >
            ⇔
          </button>
          <button
            onClick={() => onChange({ ...settings, width: "boxed" })}
            className={iconBtnCls(settings.width === "boxed")}
            title="Boxed (constrained width)"
          >
            ☐
          </button>
        </div>
        <p className="text-[10px] text-zinc-400">
          {settings.width === "full" ? "Full width — edge to edge" : `Boxed — max ${settings.maxWidth}px`}
        </p>
      </div>

      {settings.width === "boxed" && (
        <NumberSlider
          label="Max Width"
          value={settings.maxWidth}
          onChange={(v) => onChange({ ...settings, maxWidth: v })}
          min={600}
          max={1920}
        />
      )}

      <NumberSlider
        label="Min Height"
        value={settings.minHeight}
        onChange={(v) => onChange({ ...settings, minHeight: v })}
        min={0}
        max={1000}
      />

      {/* ── DIRECTION / ALIGNMENT ──────────────────────────────── */}
      <div className="space-y-2">
        <span className={labelCls}>Direction</span>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ ...settings, direction: "row" })}
            className={iconBtnCls(settings.direction === "row")}
            title="Horizontal"
          >
            ⇄
          </button>
          <button
            onClick={() => onChange({ ...settings, direction: "column" })}
            className={iconBtnCls(settings.direction === "column")}
            title="Vertical"
          >
            ⇅
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <span className={labelCls}>Justify Content</span>
        <div className="flex flex-wrap gap-1">
          {(["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => onChange({ ...settings, justifyContent: opt })}
              className={iconBtnCls(settings.justifyContent === opt)}
              title={opt}
            >
              {opt === "flex-start" ? "⇤" : opt === "center" ? "⇔" : opt === "flex-end" ? "⇥" : opt === "space-between" ? "⟷" : opt === "space-around" ? "اخبار" : "EmptyEntries"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className={labelCls}>Align Items</span>
        <div className="flex gap-1">
          {(["stretch", "flex-start", "center", "flex-end"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => onChange({ ...settings, alignItems: opt })}
              className={iconBtnCls(settings.alignItems === opt)}
              title={opt}
            >
              {opt === "stretch" ? "⬍" : opt === "flex-start" ? "↟" : opt === "center" ? "บาลานซ์" : "↡"}
            </button>
          ))}
        </div>
      </div>

      {/* ── GAP ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <NumberSlider
          label="Column Gap"
          value={settings.gapCol}
          onChange={(v) => onChange({ ...settings, gapCol: v })}
          min={0}
          max={100}
        />
        <NumberSlider
          label="Row Gap"
          value={settings.gapRow}
          onChange={(v) => onChange({ ...settings, gapRow: v })}
          min={0}
          max={100}
        />
      </div>

      {/* ── BACKGROUND ──────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={labelCls}>Background</span>
          <button
            type="button"
            onClick={() => setBgLinked(!bgLinked)}
            className="text-[10px] text-zinc-400 hover:text-zinc-600"
          >
            {bgLinked ? "🔗 Linked" : "⛓️‍💥 Unlinked"}
          </button>
        </div>

        <GlobalColorPicker
          label="Color"
          value={settings.bgColor}
          onChange={(c) => onChange({ ...settings, bgColor: c })}
          paletteOverride={themeColors}
        />

        <BuilderImageUploader
          label="Image"
          value={settings.bgImage || ""}
          onChange={(url) => onChange({ ...settings, bgImage: url })}
        />

        {settings.bgImage && (
          <>
            <label className={labelCls}>Position
              <select
                value={settings.bgPosition || "center center"}
                onChange={(e) => onChange({ ...settings, bgPosition: e.target.value })}
                className={inputCls}
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
                value={settings.bgSize || "cover"}
                onChange={(e) => onChange({ ...settings, bgSize: e.target.value })}
                className={inputCls}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="auto">Auto</option>
                <option value="100% 100%">Stretch</option>
              </select>
            </label>
            <label className={labelCls}>Repeat
              <select
                value={settings.bgRepeat || "no-repeat"}
                onChange={(e) => onChange({ ...settings, bgRepeat: e.target.value })}
                className={inputCls}
              >
                <option value="no-repeat">No Repeat</option>
                <option value="repeat">Repeat</option>
                <option value="repeat-x">Repeat X</option>
                <option value="repeat-y">Repeat Y</option>
              </select>
            </label>
            <div className="space-y-2">
              <span className={labelCls}>Overlay</span>
              <div className="grid grid-cols-2 gap-2">
                <GlobalColorPicker
                  label="Color"
                  value={settings.overlayColor || "#000000"}
                  onChange={(c) => onChange({ ...settings, overlayColor: c })}
                  paletteOverride={themeColors}
                />
                <NumberSlider
                  label="Opacity"
                  value={settings.overlayOpacity ?? 50}
                  onChange={(v) => onChange({ ...settings, overlayOpacity: v })}
                  min={0}
                  max={100}
                  suffix="%"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── BORDER ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        <span className={labelCls}>Border</span>
        <select
          value={settings.borderStyle}
          onChange={(e) => onChange({ ...settings, borderStyle: e.target.value as ContainerSettings["borderStyle"] })}
          className={inputCls}
        >
          <option value="none">None</option>
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>

        {settings.borderStyle !== "none" && (
          <>
            <NumberSlider
              label="Width"
              value={settings.borderWidth}
              onChange={(v) => onChange({ ...settings, borderWidth: v })}
              min={0}
              max={20}
            />
            <GlobalColorPicker
              label="Color"
              value={settings.borderColor || "#000000"}
              onChange={(c) => onChange({ ...settings, borderColor: c })}
              paletteOverride={themeColors}
            />
            <NumberSlider
              label="Radius"
              value={settings.borderRadius}
              onChange={(v) => onChange({ ...settings, borderRadius: v })}
              min={0}
              max={100}
            />
          </>
        )}
      </div>

      {/* ── SPACING ─────────────────────────────────────────────── */}
      <SpacingInput
        label="Margin"
        value={settings.margin}
        onChange={(v) => onChange({ ...settings, margin: v })}
        linked={linkedMargin}
        onToggleLinked={() => setLinkedMargin(!linkedMargin)}
      />

      <SpacingInput
        label="Padding"
        value={settings.padding}
        onChange={(v) => onChange({ ...settings, padding: v })}
        linked={linkedPadding}
        onToggleLinked={() => setLinkedPadding(!linkedPadding)}
      />

      {/* ── ADVANCED ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <NumberSlider
          label="Z-Index"
          value={settings.zindex}
          onChange={(v) => onChange({ ...settings, zindex: v })}
          min={0}
          max={9999}
        />
        <label className={labelCls}>CSS ID
          <input
            type="text"
            value={settings.cssId}
            onChange={(e) => onChange({ ...settings, cssId: e.target.value })}
            className={inputCls}
            placeholder="my-container"
          />
        </label>
        <label className={labelCls}>CSS Classes
          <input
            type="text"
            value={settings.cssClasses}
            onChange={(e) => onChange({ ...settings, cssClasses: e.target.value })}
            className={inputCls}
            placeholder="class1 class2"
          />
        </label>
      </div>
    </div>
  );
}
