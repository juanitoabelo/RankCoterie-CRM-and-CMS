"use client";

import { useState } from "react";
import type { ContainerSettings } from "@/lib/header-footer/types";
import { DEFAULT_CONTAINER_SETTINGS } from "@/lib/header-footer/types";
import GlobalColorPicker from "./GlobalColorPicker";
import BuilderImageUploader from "./BuilderImageUploader";

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
            className="h-1 w-24 accent-zinc-900"
          />
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            min={min}
            max={max}
            className="w-16 rounded border border-zinc-300 px-2 py-1 text-right text-xs"
          />
          <span className="text-[10px] text-zinc-400">{suffix}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Layout Tab ────────────────────────────────────────────────────────── */

function LayoutTab({ settings, onChange, themeColors }: Props) {
  return (
    <div className="space-y-4">
      {/* Content Width */}
      <div>
        <span className={labelCls}>Content Width</span>
        <div className="mt-1 flex gap-1">
          <button
            type="button"
            onClick={() => onChange({ ...settings, width: "full" })}
            className={iconBtnCls(settings.width === "full")}
            title="Full Width"
          >
            ↔
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...settings, width: "boxed" })}
            className={iconBtnCls(settings.width === "boxed")}
            title="Boxed"
          >
            ▣
          </button>
        </div>
      </div>

      {/* Max Width */}
      {settings.width === "boxed" && (
        <NumberSlider
          label="Width"
          value={settings.maxWidth}
          onChange={(v) => onChange({ ...settings, maxWidth: v })}
          min={400}
          max={1920}
        />
      )}

      {/* Min Height */}
      <NumberSlider
        label="Min Height"
        value={settings.minHeight}
        onChange={(v) => onChange({ ...settings, minHeight: v })}
        min={0}
        max={800}
      />

      {/* Direction */}
      <div>
        <span className={labelCls}>Direction</span>
        <div className="mt-1 flex gap-1">
          <button
            type="button"
            onClick={() => onChange({ ...settings, direction: "row" })}
            className={iconBtnCls(settings.direction === "row")}
            title="Row"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...settings, direction: "column" })}
            className={iconBtnCls(settings.direction === "column")}
            title="Column"
          >
            ↓
          </button>
        </div>
      </div>

      {/* Justify Content */}
      <div>
        <span className={labelCls}>Justify Content</span>
        <div className="mt-1 flex gap-1">
          {[
            { value: "flex-start", icon: "⇤", label: "Start" },
            { value: "center", icon: "⇔", label: "Center" },
            { value: "flex-end", icon: "⇥", label: "End" },
            { value: "space-between", icon: "⟷", label: "Space Between" },
            { value: "space-around", icon: "⟺", label: "Space Around" },
            { value: "space-evenly", icon: "⟺", label: "Space Evenly" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...settings, justifyContent: opt.value as ContainerSettings["justifyContent"] })}
              className={iconBtnCls(settings.justifyContent === opt.value)}
              title={opt.label}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Align Items */}
      <div>
        <span className={labelCls}>Align Items</span>
        <div className="mt-1 flex gap-1">
          {[
            { value: "stretch", icon: "⇕", label: "Stretch" },
            { value: "flex-start", icon: "⇖", label: "Start" },
            { value: "center", icon: "⇔", label: "Center" },
            { value: "flex-end", icon: "⇘", label: "End" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...settings, alignItems: opt.value as ContainerSettings["alignItems"] })}
              className={iconBtnCls(settings.alignItems === opt.value)}
              title={opt.label}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Gaps */}
      <div className="grid grid-cols-2 gap-3">
        <NumberSlider
          label="Column Gap"
          value={settings.gapCol}
          onChange={(v) => onChange({ ...settings, gapCol: v })}
          max={200}
        />
        <NumberSlider
          label="Row Gap"
          value={settings.gapRow}
          onChange={(v) => onChange({ ...settings, gapRow: v })}
          max={200}
        />
      </div>

      {/* Wrap */}
      <div>
        <span className={labelCls}>Wrap</span>
        <div className="mt-1 flex gap-1">
          <button
            type="button"
            onClick={() => onChange({ ...settings, wrap: "nowrap" })}
            className={iconBtnCls(settings.wrap === "nowrap")}
            title="No Wrap"
          >
            ⇸
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...settings, wrap: "wrap" })}
            className={iconBtnCls(settings.wrap === "wrap")}
            title="Wrap"
          >
            ⇝
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Style Tab ─────────────────────────────────────────────────────────── */

function StyleTab({ settings, onChange, themeColors }: Props) {
  return (
    <div className="space-y-4">
      {/* Background */}
      <GlobalColorPicker
        label="Background Color"
        value={settings.bgColor}
        onChange={(c) => onChange({ ...settings, bgColor: c || undefined })}
        allowClear
        paletteOverride={themeColors}
      />

      {/* Background Image */}
      <BuilderImageUploader
        label="Background Image"
        value={settings.bgImage || ""}
        onChange={(url) => onChange({ ...settings, bgImage: url || undefined })}
      />

      {settings.bgImage && (
        <>
          <div>
            <span className={labelCls}>Background Position</span>
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
          </div>
          <div>
            <span className={labelCls}>Background Size</span>
            <select
              value={settings.bgSize || "cover"}
              onChange={(e) => onChange({ ...settings, bgSize: e.target.value })}
              className={inputCls}
            >
              <option value="auto">Auto</option>
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
            </select>
          </div>
          <div>
            <span className={labelCls}>Background Repeat</span>
            <select
              value={settings.bgRepeat || "no-repeat"}
              onChange={(e) => onChange({ ...settings, bgRepeat: e.target.value })}
              className={inputCls}
            >
              <option value="repeat">Repeat</option>
              <option value="no-repeat">No Repeat</option>
              <option value="repeat-x">Repeat X</option>
              <option value="repeat-y">Repeat Y</option>
            </select>
          </div>
        </>
      )}

      {/* Overlay */}
      {settings.bgImage && (
        <div className="border-t border-zinc-200 pt-4">
          <GlobalColorPicker
            label="Overlay Color"
            value={settings.overlayColor}
            onChange={(c) => onChange({ ...settings, overlayColor: c || undefined })}
            paletteOverride={themeColors}
          />
          <div className="mt-3">
            <NumberSlider
              label="Overlay Opacity"
              value={settings.overlayOpacity || 0}
              onChange={(v) => onChange({ ...settings, overlayOpacity: v })}
              min={0}
              max={100}
              suffix="%"
            />
          </div>
        </div>
      )}

      {/* Border */}
      <div className="border-t border-zinc-200 pt-4">
        <span className={labelCls}>Border Style</span>
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
      </div>

      {settings.borderStyle !== "none" && (
        <>
          <NumberSlider
            label="Border Width"
            value={settings.borderWidth}
            onChange={(v) => onChange({ ...settings, borderWidth: v })}
            max={20}
          />
          <GlobalColorPicker
            label="Border Color"
            value={settings.borderColor}
            onChange={(c) => onChange({ ...settings, borderColor: c })}
            paletteOverride={themeColors}
          />
        </>
      )}

      <NumberSlider
        label="Border Radius"
        value={settings.borderRadius}
        onChange={(v) => onChange({ ...settings, borderRadius: v })}
        max={100}
      />

      <div>
        <span className={labelCls}>Box Shadow</span>
        <select
          value={settings.boxShadow ?? ""}
          onChange={(e) => onChange({ ...settings, boxShadow: e.target.value || undefined })}
          className={inputCls}
        >
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

function AdvancedTab({ settings, onChange }: Props) {
  const [marginLinked, setMarginLinked] = useState(true);
  const [paddingLinked, setPaddingLinked] = useState(true);

  return (
    <div className="space-y-4">
      <SpacingInput
        label="Margin"
        value={settings.margin}
        onChange={(v) => onChange({ ...settings, margin: v })}
        linked={marginLinked}
        onToggleLinked={() => setMarginLinked(!marginLinked)}
      />

      <SpacingInput
        label="Padding"
        value={settings.padding}
        onChange={(v) => onChange({ ...settings, padding: v })}
        linked={paddingLinked}
        onToggleLinked={() => setPaddingLinked(!paddingLinked)}
      />

      <div className="border-t border-zinc-200 pt-4">
        <NumberSlider
          label="Z-Index"
          value={settings.zindex}
          onChange={(v) => onChange({ ...settings, zindex: v })}
          min={0}
          max={9999}
          suffix=""
        />
      </div>

      <div>
        <span className={labelCls}>CSS ID</span>
        <input
          type="text"
          value={settings.cssId}
          onChange={(e) => onChange({ ...settings, cssId: e.target.value })}
          placeholder="my-header"
          className={inputCls}
        />
      </div>

      <div>
        <span className={labelCls}>CSS Classes</span>
        <input
          type="text"
          value={settings.cssClasses}
          onChange={(e) => onChange({ ...settings, cssClasses: e.target.value })}
          placeholder="custom-class another-class"
          className={inputCls}
        />
      </div>
    </div>
  );
}

/* ── Main ContainerSettingsEditor ──────────────────────────────────────── */

type Tab = "layout" | "style" | "advanced";

export default function ContainerSettingsEditor({ settings, onChange, themeColors }: Props) {
  const [tab, setTab] = useState<Tab>("layout");

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "layout", label: "Layout" },
    { id: "style", label: "Style" },
    { id: "advanced", label: "Advanced" },
  ];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Container
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-medium ${
              tab === t.id
                ? "border-b-2 border-zinc-900 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {tab === "layout" && <LayoutTab settings={settings} onChange={onChange} themeColors={themeColors} />}
        {tab === "style" && <StyleTab settings={settings} onChange={onChange} themeColors={themeColors} />}
        {tab === "advanced" && <AdvancedTab settings={settings} onChange={onChange} />}
      </div>
    </div>
  );
}
