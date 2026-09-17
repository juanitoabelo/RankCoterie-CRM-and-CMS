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
      <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
        <span className={labelCls}>Layout</span>
        <div className="mt-2 space-y-3">
          <div>
            <span className={labelCls}>Content Width</span>
            <select value={settings.width} onChange={(e) => onChange({ ...settings, width: e.target.value as "full" | "boxed" })} className={inputCls}>
              <option value="full">Full Width</option>
              <option value="boxed">Boxed</option>
            </select>
          </div>

          {settings.width === "boxed" && (
            <NumberSlider label="Width" value={settings.maxWidth} onChange={(v) => onChange({ ...settings, maxWidth: v })} min={400} max={1920} />
          )}

          <div>
            <span className={labelCls}>Columns Gap</span>
            <select value={settings.gapCol} onChange={(e) => onChange({ ...settings, gapCol: Number(e.target.value) })} className={inputCls}>
              <option value={0}>Default</option>
              <option value={0}>No Gap</option>
              <option value={10}>Narrow</option>
              <option value={20}>Extended</option>
              <option value={40}>Wide</option>
              <option value={60}>Wide Maximum</option>
            </select>
          </div>

          <div>
            <span className={labelCls}>Height</span>
            <select value={settings.height ?? "default"} onChange={(e) => onChange({ ...settings, height: e.target.value as ContainerSettings["height"] })} className={inputCls}>
              <option value="default">Default</option>
              <option value="fitToScreen">Fit To Screen</option>
              <option value="minHeight">Min Height</option>
            </select>
          </div>

          {settings.height === "minHeight" && (
            <NumberSlider label="Minimum Height" value={settings.minHeight} onChange={(v) => onChange({ ...settings, minHeight: v })} min={0} max={1500} />
          )}

          <div>
            <span className={labelCls}>Vertical Align</span>
            <select value={settings.verticalAlign ?? "default"} onChange={(e) => onChange({ ...settings, verticalAlign: e.target.value as ContainerSettings["verticalAlign"] })} className={inputCls}>
              <option value="default">Default</option>
              <option value="top">Top</option>
              <option value="middle">Middle</option>
              <option value="bottom">Bottom</option>
              <option value="spaceBetween">Space Between</option>
              <option value="spaceAround">Space Around</option>
            </select>
          </div>

          <div>
            <span className={labelCls}>Overflow</span>
            <select value={settings.overflow ?? "default"} onChange={(e) => onChange({ ...settings, overflow: e.target.value as ContainerSettings["overflow"] })} className={inputCls}>
              <option value="default">Default</option>
              <option value="hidden">Hidden</option>
              <option value="visible">Visible</option>
              <option value="scroll">Scroll</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          <div>
            <span className={labelCls}>HTML Tag</span>
            <select value={settings.htmlTag ?? "default"} onChange={(e) => onChange({ ...settings, htmlTag: e.target.value as ContainerSettings["htmlTag"] })} className={inputCls}>
              <option value="default">Default</option>
              <option value="div">div</option>
              <option value="section">section</option>
              <option value="article">article</option>
              <option value="aside">aside</option>
              <option value="main">main</option>
              <option value="header">header</option>
              <option value="footer">footer</option>
              <option value="nav">nav</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
        <span className={labelCls}>Structure</span>
      </div>
    </div>
  );
}

/* ── Style Tab ─────────────────────────────────────────────────────────── */

const SHAPE_DIVIDER_TYPES = [
  { value: "", label: "None" },
  { value: "mountains", label: "Mountains" },
  { value: "drops", label: "Drops" },
  { value: "clouds", label: "Clouds" },
  { value: "tilt", label: "Tilt" },
  { value: "wave", label: "Wave" },
  { value: "tilt_opacity", label: "Tilt Opacity" },
  { value: "mountains_opacity", label: "Mountains Opacity" },
  { value: "clouds_opacity", label: "Clouds Opacity" },
  { value: "drops_opacity", label: "Drops Opacity" },
  { value: "curve_opacity", label: "Curve Opacity" },
  { value: "fan_opacity", label: "Fan Opacity" },
  { value: "wave_opacity", label: "Wave Opacity" },
  { value: "triangle_opacity", label: "Triangle Opacity" },
];

function StyleTab({ settings, onChange, themeColors }: Props) {
  const [bgState, setBgState] = useState<"normal" | "hover">("normal");
  const [dividerTab, setDividerTab] = useState<"top" | "bottom">("top");

  const getBgProp = (key: string) => bgState === "hover" ? `hover${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;

  return (
    <div className="space-y-4">
      {/* Background */}
      <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
        <span className={labelCls}>Background</span>
        <div className="mt-2 space-y-3">
          <div className="flex rounded-lg border border-zinc-200 p-0.5">
            <button type="button" onClick={() => setBgState("normal")} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${bgState === "normal" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>Normal</button>
            <button type="button" onClick={() => setBgState("hover")} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${bgState === "hover" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>Hover</button>
          </div>

          <div>
            <span className={labelCls}>Background Type</span>
            <div className="mt-1 flex gap-1">
              <button type="button" onClick={() => onChange({ ...settings, bgType: "classic" } as ContainerSettings)} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${(settings.bgType ?? "classic") === "classic" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title="Classic">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              <button type="button" onClick={() => onChange({ ...settings, bgType: "gradient" } as ContainerSettings)} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${settings.bgType === "gradient" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title="Gradient">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
              </button>
              <button type="button" onClick={() => onChange({ ...settings, bgType: "video" } as ContainerSettings)} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${settings.bgType === "video" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title="Video">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
              <button type="button" onClick={() => onChange({ ...settings, bgType: "slideshow" } as ContainerSettings)} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${settings.bgType === "slideshow" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title="Slideshow">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
            </div>
          </div>

          {settings.bgType === "gradient" ? (
            <>
              <GlobalColorPicker label="Gradient Start" value={settings.bgGradientStart} onChange={(c) => onChange({ ...settings, bgGradientStart: c || undefined } as ContainerSettings)} paletteOverride={themeColors} />
              <GlobalColorPicker label="Gradient End" value={settings.bgGradientEnd} onChange={(c) => onChange({ ...settings, bgGradientEnd: c || undefined } as ContainerSettings)} paletteOverride={themeColors} />
              <NumberSlider label="Angle" value={settings.bgGradientAngle || 180} onChange={(v) => onChange({ ...settings, bgGradientAngle: v } as ContainerSettings)} min={0} max={360} suffix="deg" />
            </>
          ) : (
            <>
              <GlobalColorPicker label="Background Color" value={bgState === "hover" ? undefined : settings.bgColor} onChange={(c) => onChange({ ...settings, bgColor: c || undefined } as ContainerSettings)} allowClear paletteOverride={themeColors} />
              <BuilderImageUploader label="Background Image" value={settings.bgImage || ""} onChange={(url) => onChange({ ...settings, bgImage: url || undefined } as ContainerSettings)} />

              {settings.bgImage && (
                <>
                  <div>
                    <span className={labelCls}>Position</span>
                    <select value={settings.bgPosition || "center center"} onChange={(e) => onChange({ ...settings, bgPosition: e.target.value } as ContainerSettings)} className={inputCls}>
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
                    <span className={labelCls}>Size</span>
                    <select value={settings.bgSize || "cover"} onChange={(e) => onChange({ ...settings, bgSize: e.target.value } as ContainerSettings)} className={inputCls}>
                      <option value="auto">Auto</option>
                      <option value="cover">Cover</option>
                      <option value="contain">Contain</option>
                    </select>
                  </div>
                  <div>
                    <span className={labelCls}>Repeat</span>
                    <select value={settings.bgRepeat || "no-repeat"} onChange={(e) => onChange({ ...settings, bgRepeat: e.target.value } as ContainerSettings)} className={inputCls}>
                      <option value="repeat">Repeat</option>
                      <option value="no-repeat">No Repeat</option>
                      <option value="repeat-x">Repeat X</option>
                      <option value="repeat-y">Repeat Y</option>
                    </select>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Background Overlay */}
      <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
        <span className={labelCls}>Background Overlay</span>
        <div className="mt-2 space-y-3">
          <div>
            <span className={labelCls}>Background Type</span>
            <div className="mt-1 flex gap-1">
              <button type="button" onClick={() => onChange({ ...settings, overlayBgType: "classic" })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${(settings.overlayBgType ?? "classic") === "classic" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title="Classic">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              <button type="button" onClick={() => onChange({ ...settings, overlayBgType: "gradient" })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${settings.overlayBgType === "gradient" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title="Gradient">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
              </button>
            </div>
          </div>
          <GlobalColorPicker label="Overlay Color" value={settings.overlayColor} onChange={(c) => onChange({ ...settings, overlayColor: c || undefined })} paletteOverride={themeColors} />
          <NumberSlider label="Opacity" value={settings.overlayOpacity || 0} onChange={(v) => onChange({ ...settings, overlayOpacity: v })} min={0} max={100} suffix="%" />
        </div>
      </div>

      {/* Border */}
      <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
        <span className={labelCls}>Border</span>
        <div className="mt-2 space-y-3">
          <div>
            <span className={labelCls}>Border Type</span>
            <select value={settings.borderStyle} onChange={(e) => onChange({ ...settings, borderStyle: e.target.value as ContainerSettings["borderStyle"] })} className={inputCls}>
              <option value="none">Default</option>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
              <option value="double">Double</option>
            </select>
          </div>

          {settings.borderStyle !== "none" && (
            <div className="grid grid-cols-2 gap-2">
              <NumberSlider label="Width" value={settings.borderWidth} onChange={(v) => onChange({ ...settings, borderWidth: v })} max={20} />
              <GlobalColorPicker label="Color" value={settings.borderColor} onChange={(c) => onChange({ ...settings, borderColor: c })} paletteOverride={themeColors} />
            </div>
          )}

          <NumberSlider label="Border Radius" value={settings.borderRadius} onChange={(v) => onChange({ ...settings, borderRadius: v })} max={100} />

          <div>
            <span className={labelCls}>Box Shadow</span>
            <select value={settings.boxShadow ?? ""} onChange={(e) => onChange({ ...settings, boxShadow: e.target.value || undefined })} className={inputCls}>
              <option value="">None</option>
              <option value="0 1px 3px rgba(0,0,0,0.12)">Subtle</option>
              <option value="0 4px 6px rgba(0,0,0,0.1)">Medium</option>
              <option value="0 10px 15px rgba(0,0,0,0.1)">Large</option>
              <option value="0 20px 25px rgba(0,0,0,0.15)">Extra Large</option>
              <option value="inset 0 2px 4px rgba(0,0,0,0.06)">Inset</option>
            </select>
          </div>
        </div>
      </div>

      {/* Shape Divider */}
      <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
        <span className={labelCls}>Shape Divider</span>
        <div className="mt-2 space-y-3">
          <div className="flex rounded-lg border border-zinc-200 p-0.5">
            <button type="button" onClick={() => setDividerTab("top")} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${dividerTab === "top" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>Top</button>
            <button type="button" onClick={() => setDividerTab("bottom")} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${dividerTab === "bottom" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>Bottom</button>
          </div>

          <div>
            <span className={labelCls}>Type</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {SHAPE_DIVIDER_TYPES.map((shape) => {
                const currentValue = dividerTab === "top" ? settings.shapeDividerTop : settings.shapeDividerBottom;
                return (
                  <button key={shape.value} type="button" onClick={() => onChange({ ...settings, ...(dividerTab === "top" ? { shapeDividerTop: shape.value } : { shapeDividerBottom: shape.value }) })} className={`rounded border p-2 text-[10px] ${currentValue === shape.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`}>
                    {shape.label}
                  </button>
                );
              })}
            </div>
          </div>

          {(dividerTab === "top" ? settings.shapeDividerTop : settings.shapeDividerBottom) && (
            <>
              <GlobalColorPicker label="Color" value={dividerTab === "top" ? settings.shapeDividerTopColor : settings.shapeDividerBottomColor} onChange={(c) => onChange({ ...settings, ...(dividerTab === "top" ? { shapeDividerTopColor: c || undefined } : { shapeDividerBottomColor: c || undefined }) })} paletteOverride={themeColors} />
              <NumberSlider label="Width" value={(dividerTab === "top" ? settings.shapeDividerTopWidth : settings.shapeDividerBottomWidth) ?? 100} onChange={(v) => onChange({ ...settings, ...(dividerTab === "top" ? { shapeDividerTopWidth: v } : { shapeDividerBottomWidth: v }) })} min={0} max={100} suffix="%" />
              <NumberSlider label="Height" value={(dividerTab === "top" ? settings.shapeDividerTopHeight : settings.shapeDividerBottomHeight) ?? 100} onChange={(v) => onChange({ ...settings, ...(dividerTab === "top" ? { shapeDividerTopHeight: v } : { shapeDividerBottomHeight: v }) })} min={0} max={500} />
            </>
          )}
        </div>
      </div>

      {/* Typography */}
      <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
        <span className={labelCls}>Typography</span>
        <div className="mt-2 space-y-3">
          <GlobalColorPicker label="Heading Color" value={settings.headingColor} onChange={(c) => onChange({ ...settings, headingColor: c || undefined })} allowClear paletteOverride={themeColors} />
          <GlobalColorPicker label="Text Color" value={settings.textColor} onChange={(c) => onChange({ ...settings, textColor: c || undefined })} allowClear paletteOverride={themeColors} />
          <GlobalColorPicker label="Link Color" value={settings.linkColor} onChange={(c) => onChange({ ...settings, linkColor: c || undefined })} allowClear paletteOverride={themeColors} />
          <GlobalColorPicker label="Link Hover Color" value={settings.linkHoverColor} onChange={(c) => onChange({ ...settings, linkHoverColor: c || undefined })} allowClear paletteOverride={themeColors} />
          <div>
            <span className={labelCls}>Text Align</span>
            <div className="mt-1 flex gap-1">
              {[
                { value: "left", icon: "≡", label: "Left" },
                { value: "center", icon: "≡", label: "Center" },
                { value: "right", icon: "≡", label: "Right" },
                { value: "justify", icon: "≡", label: "Justify" },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => onChange({ ...settings, textAlign: opt.value as ContainerSettings["textAlign"] })} className={iconBtnCls((settings.textAlign ?? "left") === opt.value)} title={opt.label}>{opt.icon}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Advanced Tab ──────────────────────────────────────────────────────── */

const ENTRANCE_ANIMATIONS = [
  "", "fadeIn", "fadeInUp", "fadeInDown", "fadeInLeft", "fadeInRight",
  "zoomIn", "zoomInUp", "bounceIn", "slideInUp", "slideInDown",
];

function AdvancedTab({ settings, onChange }: Props) {
  const [marginLinked, setMarginLinked] = useState(true);
  const [paddingLinked, setPaddingLinked] = useState(true);
  const [openSection, setOpenSection] = useState<string | null>("advanced");

  const toggle = (key: string) => setOpenSection(openSection === key ? null : key);

  return (
    <div className="space-y-1">
      {/* Advanced */}
      <button type="button" onClick={() => toggle("advanced")} className="flex w-full items-center justify-between border-t border-zinc-200 pt-3 text-xs font-semibold text-zinc-700">
        Advanced
        <span className="text-zinc-400">{openSection === "advanced" ? "▾" : "▸"}</span>
      </button>
      {openSection === "advanced" && (
        <div className="space-y-3 pb-3">
          <SpacingInput label="Margin" value={settings.margin} onChange={(v) => onChange({ ...settings, margin: v })} linked={marginLinked} onToggleLinked={() => setMarginLinked(!marginLinked)} />
          <SpacingInput label="Padding" value={settings.padding} onChange={(v) => onChange({ ...settings, padding: v })} linked={paddingLinked} onToggleLinked={() => setPaddingLinked(!paddingLinked)} />

          <div className="border-t border-zinc-200 pt-3">
            <NumberSlider label="Z-Index" value={settings.zindex} onChange={(v) => onChange({ ...settings, zindex: v })} min={0} max={9999} suffix="" />
          </div>

          <div>
            <span className={labelCls}>CSS ID</span>
            <input type="text" value={settings.cssId} onChange={(e) => onChange({ ...settings, cssId: e.target.value })} placeholder="my-header" className={inputCls} />
          </div>

          <div>
            <span className={labelCls}>CSS Classes</span>
            <input type="text" value={settings.cssClasses} onChange={(e) => onChange({ ...settings, cssClasses: e.target.value })} placeholder="custom-class another-class" className={inputCls} />
          </div>

          <div className="flex items-center justify-between">
            <span className={labelCls}>Display Conditions</span>
            <span className="text-[10px] text-zinc-400">🔒</span>
          </div>
        </div>
      )}

      {/* Motion Effects */}
      <button type="button" onClick={() => toggle("motionEffects")} className="flex w-full items-center justify-between border-t border-zinc-200 pt-3 text-xs font-semibold text-zinc-700">
        Motion Effects
        <span className="text-zinc-400">{openSection === "motionEffects" ? "▾" : "▸"}</span>
      </button>
      {openSection === "motionEffects" && (
        <div className="space-y-3 pb-3">
          <div className="flex items-center justify-between">
            <span className={labelCls}>Scrolling Effects</span>
            <button type="button" onClick={() => onChange({ ...settings, scrollingEffects: !settings.scrollingEffects })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.scrollingEffects ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.scrollingEffects ? "translate-x-6" : "translate-x-1"}`} />
              <span className={`absolute text-[9px] font-medium ${settings.scrollingEffects ? "right-1 text-white" : "left-1.5 text-zinc-600"}`}>{settings.scrollingEffects ? "On" : "Off"}</span>
            </button>
          </div>

          <div>
            <span className={labelCls}>Sticky</span>
            <select value={settings.sticky ?? "none"} onChange={(e) => onChange({ ...settings, sticky: e.target.value as "none" | "top" | "bottom" })} className={inputCls}>
              <option value="none">None</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className={labelCls}>Entrance Animation</span>
              <span className="text-[10px] text-zinc-400">🖥</span>
            </div>
            <select value={settings.entranceAnimation ?? ""} onChange={(e) => onChange({ ...settings, entranceAnimation: e.target.value || undefined })} className={inputCls}>
              <option value="">Default</option>
              {ENTRANCE_ANIMATIONS.filter(Boolean).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Responsive */}
      <button type="button" onClick={() => toggle("responsive")} className="flex w-full items-center justify-between border-t border-zinc-200 pt-3 text-xs font-semibold text-zinc-700">
        Responsive
        <span className="text-zinc-400">{openSection === "responsive" ? "▾" : "▸"}</span>
      </button>
      {openSection === "responsive" && (
        <div className="space-y-3 pb-3">
          <div className="flex items-center justify-between">
            <span className={labelCls}>Reverse Columns (Tablet Portrait)</span>
            <button type="button" onClick={() => onChange({ ...settings, reverseColumnsTablet: !settings.reverseColumnsTablet })} className={`relative h-6 w-11 rounded-full transition-colors ${settings.reverseColumnsTablet ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${settings.reverseColumnsTablet ? "translate-x-5" : ""}`} />
              <span className={`absolute text-[9px] font-medium ${settings.reverseColumnsTablet ? "right-1 text-white" : "left-1.5 text-zinc-600"}`}>{settings.reverseColumnsTablet ? "Yes" : "No"}</span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className={labelCls}>Reverse Columns (Mobile Portrait)</span>
            <button type="button" onClick={() => onChange({ ...settings, reverseColumnsMobile: !settings.reverseColumnsMobile })} className={`relative h-6 w-11 rounded-full transition-colors ${settings.reverseColumnsMobile ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${settings.reverseColumnsMobile ? "translate-x-5" : ""}`} />
              <span className={`absolute text-[9px] font-medium ${settings.reverseColumnsMobile ? "right-1 text-white" : "left-1.5 text-zinc-600"}`}>{settings.reverseColumnsMobile ? "Yes" : "No"}</span>
            </button>
          </div>

          <div className="border-t border-zinc-200 pt-3">
            <span className="text-xs font-semibold text-zinc-700">Visibility</span>
            <p className="mt-1 text-[10px] text-zinc-400">Responsive visibility will take effect only on <span className="text-zinc-500 underline">preview mode</span> or live page.</p>
          </div>

          <div className="flex items-center justify-between">
            <span className={labelCls}>Hide On Desktop</span>
            <button type="button" onClick={() => onChange({ ...settings, hideOnDesktop: !settings.hideOnDesktop })} className={`relative h-6 w-11 rounded-full transition-colors ${settings.hideOnDesktop ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${settings.hideOnDesktop ? "translate-x-5" : ""}`} />
              <span className={`absolute text-[9px] font-medium ${settings.hideOnDesktop ? "right-1 text-white" : "left-1.5 text-zinc-600"}`}>{settings.hideOnDesktop ? "Hide" : "Show"}</span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className={labelCls}>Hide On Tablet Portrait</span>
            <button type="button" onClick={() => onChange({ ...settings, hideOnTablet: !settings.hideOnTablet })} className={`relative h-6 w-11 rounded-full transition-colors ${settings.hideOnTablet ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${settings.hideOnTablet ? "translate-x-5" : ""}`} />
              <span className={`absolute text-[9px] font-medium ${settings.hideOnTablet ? "right-1 text-white" : "left-1.5 text-zinc-600"}`}>{settings.hideOnTablet ? "Hide" : "Show"}</span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className={labelCls}>Hide On Mobile Portrait</span>
            <button type="button" onClick={() => onChange({ ...settings, hideOnMobile: !settings.hideOnMobile })} className={`relative h-6 w-11 rounded-full transition-colors ${settings.hideOnMobile ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${settings.hideOnMobile ? "translate-x-5" : ""}`} />
              <span className={`absolute text-[9px] font-medium ${settings.hideOnMobile ? "right-1 text-white" : "left-1.5 text-zinc-600"}`}>{settings.hideOnMobile ? "Hide" : "Show"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Attributes */}
      <button type="button" onClick={() => toggle("attributes")} className="flex w-full items-center justify-between border-t border-zinc-200 pt-3 text-xs font-semibold text-zinc-700">
        Attributes
        <span className="text-zinc-400">{openSection === "attributes" ? "▾" : "▸"}</span>
      </button>
      {openSection === "attributes" && (
        <div className="space-y-3 pb-3">
          <label className={labelCls}>Custom Attributes
            <textarea className={`${inputCls} font-mono text-xs`} rows={3} value={settings.customAttributes ?? ""} onChange={(e) => onChange({ ...settings, customAttributes: e.target.value })} placeholder={"key|value\nkey2|value2"} />
          </label>
          <p className="text-[10px] leading-snug text-zinc-400">
            Set custom attributes for the wrapper element. Each attribute in a separate line.
          </p>
        </div>
      )}

      {/* Custom CSS */}
      <button type="button" onClick={() => toggle("customCss")} className="flex w-full items-center justify-between border-t border-zinc-200 pt-3 text-xs font-semibold text-zinc-700">
        Custom CSS
        <span className="text-zinc-400">{openSection === "customCss" ? "▾" : "▸"}</span>
      </button>
      {openSection === "customCss" && (
        <div className="space-y-3 pb-3">
          <span className={labelCls}>Add your own custom CSS</span>
          <textarea className={`${inputCls} min-h-[120px] font-mono text-xs`} rows={6} value={settings.customCss ?? ""} onChange={(e) => onChange({ ...settings, customCss: e.target.value })} placeholder={".selector { color: red; }"} />
          <p className="text-[10px] leading-snug text-zinc-400">
            Use <span className="font-semibold">custom CSS</span> to style your content or add the &quot;selector&quot; prefix to target specific elements.
          </p>
        </div>
      )}
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
