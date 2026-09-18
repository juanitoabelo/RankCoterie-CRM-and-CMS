"use client";

import { useState } from "react";
import type { RowBlock } from "@/lib/page-builder/types";
import type { SpacingValues } from "@/lib/header-footer/types";
import { DEFAULT_STYLE_SETTINGS } from "@/lib/header-footer/types";
import GlobalColorPicker from "./GlobalColorPicker";
import { BackgroundFields } from "../page-builder/settings";

type Props = {
  block: RowBlock;
  onChange: (props: RowBlock["props"]) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onAddColumn: () => void;
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

function LayoutTab({ block, onChange }: { block: RowBlock; onChange: (p: RowBlock["props"]) => void }) {
  const p = block.props;
  const set = (patch: Record<string, unknown>) => onChange({ ...p, ...patch });

  return (
    <div className="space-y-4">
      <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
        <span className={labelCls}>Layout</span>
        <div className="mt-2 space-y-3">
          <div>
            <span className={labelCls}>Content Width</span>
            <select value={p.width ?? "full"} onChange={(e) => set({ width: e.target.value, fullWidth: e.target.value === "full" })} className={inputCls}>
              <option value="full">Full Width</option>
              <option value="boxed">Boxed</option>
            </select>
          </div>

          {(p.width ?? "full") === "boxed" && (
            <NumberSlider label="Width" value={p.maxWidth ?? 1200} onChange={(v) => set({ maxWidth: v })} min={320} max={3840} />
          )}

          <div>
            <span className={labelCls}>Columns Gap</span>
            <select value={p.gap} onChange={(e) => set({ gap: Number(e.target.value) })} className={inputCls}>
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
            <select value={p.height ?? "default"} onChange={(e) => set({ height: e.target.value })} className={inputCls}>
              <option value="default">Default</option>
              <option value="fitToScreen">Fit To Screen</option>
              <option value="minHeight">Min Height</option>
            </select>
          </div>

          {p.height === "minHeight" && (
            <NumberSlider label="Minimum Height" value={p.minHeight ?? 0} onChange={(v) => set({ minHeight: v })} min={0} max={1500} />
          )}

          <div>
            <span className={labelCls}>Vertical Align</span>
            <select value={p.verticalAlign ?? "default"} onChange={(e) => set({ verticalAlign: e.target.value })} className={inputCls}>
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
            <select value={p.overflow ?? "default"} onChange={(e) => set({ overflow: e.target.value })} className={inputCls}>
              <option value="default">Default</option>
              <option value="hidden">Hidden</option>
              <option value="visible">Visible</option>
              <option value="scroll">Scroll</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className={labelCls}>Stack on Mobile</span>
            <button type="button" onClick={() => set({ stackOnMobile: !p.stackOnMobile })} className={`relative h-6 w-11 rounded-full transition-colors ${p.stackOnMobile ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${p.stackOnMobile ? "translate-x-5" : ""}`} />
            </button>
          </div>

          <div>
            <span className={labelCls}>HTML Tag</span>
            <select value={p.htmlTag ?? "default"} onChange={(e) => set({ htmlTag: e.target.value })} className={inputCls}>
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

function StyleTab({ block, onChange, themeColors }: { block: RowBlock; onChange: (p: RowBlock["props"]) => void; themeColors?: Array<{ key: string; label: string; color: string }> }) {
  const p = block.props;
  const set = (patch: Record<string, unknown>) => onChange({ ...p, ...patch });
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
              <button type="button" onClick={() => set({ [getBgProp("bgType")]: "classic" })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${((p as Record<string, unknown>)[getBgProp("bgType")] as string || "classic") === "classic" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title="Classic">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              <button type="button" onClick={() => set({ [getBgProp("bgType")]: "gradient" })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${(p as Record<string, unknown>)[getBgProp("bgType")] === "gradient" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title="Gradient">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
              </button>
              <button type="button" onClick={() => set({ [getBgProp("bgType")]: "video" })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${(p as Record<string, unknown>)[getBgProp("bgType")] === "video" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title="Video">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
              <button type="button" onClick={() => set({ [getBgProp("bgType")]: "slideshow" })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${(p as Record<string, unknown>)[getBgProp("bgType")] === "slideshow" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title="Slideshow">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
            </div>
          </div>

          {(p as Record<string, unknown>)[getBgProp("bgType")] === "gradient" ? (
            <>
              <GlobalColorPicker label="Gradient Start" value={(p as Record<string, unknown>)[getBgProp("bgGradientStart")] as string} onChange={(c) => set({ [getBgProp("bgGradientStart")]: c || undefined })} paletteOverride={themeColors} />
              <GlobalColorPicker label="Gradient End" value={(p as Record<string, unknown>)[getBgProp("bgGradientEnd")] as string} onChange={(c) => set({ [getBgProp("bgGradientEnd")]: c || undefined })} paletteOverride={themeColors} />
              <NumberSlider label="Angle" value={((p as Record<string, unknown>)[getBgProp("bgGradientAngle")] as number) || 180} onChange={(v) => set({ [getBgProp("bgGradientAngle")]: v })} min={0} max={360} suffix="deg" />
            </>
          ) : (
            <>
              <BackgroundFields
                label="Row"
                color={bgState === "hover" ? undefined : p.bgColor}
                image={p.bgImage}
                bgPosition={p.bgPosition}
                bgSize={p.bgSize}
                bgRepeat={p.bgRepeat}
                onColor={(c) => set({ bgColor: c || undefined })}
                onImage={(url) => set({ bgImage: url || undefined })}
                onBgPosition={(v) => set({ bgPosition: v })}
                onBgSize={(v) => set({ bgSize: v })}
                onBgRepeat={(v) => set({ bgRepeat: v })}
                themeColors={themeColors}
              />
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
              <button type="button" onClick={() => set({ overlayBgType: "classic" })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${(p.overlayBgType ?? "classic") === "classic" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title="Classic">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              <button type="button" onClick={() => set({ overlayBgType: "gradient" })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${p.overlayBgType === "gradient" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title="Gradient">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
              </button>
            </div>
          </div>
          <GlobalColorPicker label="Overlay Color" value={p.overlayColor} onChange={(c) => set({ overlayColor: c || undefined })} paletteOverride={themeColors} />
          <NumberSlider label="Opacity" value={p.overlayOpacity || 0} onChange={(v) => set({ overlayOpacity: v })} min={0} max={100} suffix="%" />
        </div>
      </div>

      {/* Border */}
      <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
        <span className={labelCls}>Border</span>
        <div className="mt-2 space-y-3">
          <div>
            <span className={labelCls}>Border Type</span>
            <select value={p.borderStyle ?? "none"} onChange={(e) => set({ borderStyle: e.target.value })} className={inputCls}>
              <option value="none">Default</option>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
              <option value="double">Double</option>
            </select>
          </div>

          {(p.borderStyle ?? "none") !== "none" && (
            <div className="grid grid-cols-2 gap-2">
              <NumberSlider label="Width" value={p.borderWidth ?? 0} onChange={(v) => set({ borderWidth: v })} max={20} />
              <GlobalColorPicker label="Color" value={p.borderColor} onChange={(c) => set({ borderColor: c })} paletteOverride={themeColors} />
            </div>
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
                const currentValue = dividerTab === "top" ? p.shapeDividerTop : p.shapeDividerBottom;
                return (
                  <button key={shape.value} type="button" onClick={() => set(dividerTab === "top" ? { shapeDividerTop: shape.value } : { shapeDividerBottom: shape.value })} className={`rounded border p-2 text-[10px] ${currentValue === shape.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`}>
                    {shape.label}
                  </button>
                );
              })}
            </div>
          </div>

          {(dividerTab === "top" ? p.shapeDividerTop : p.shapeDividerBottom) && (
            <>
              <GlobalColorPicker label="Color" value={dividerTab === "top" ? p.shapeDividerTopColor : p.shapeDividerBottomColor} onChange={(c) => set(dividerTab === "top" ? { shapeDividerTopColor: c || undefined } : { shapeDividerBottomColor: c || undefined })} paletteOverride={themeColors} />
              <NumberSlider label="Width" value={(dividerTab === "top" ? p.shapeDividerTopWidth : p.shapeDividerBottomWidth) ?? 100} onChange={(v) => set(dividerTab === "top" ? { shapeDividerTopWidth: v } : { shapeDividerBottomWidth: v })} min={0} max={100} suffix="%" />
              <NumberSlider label="Height" value={(dividerTab === "top" ? p.shapeDividerTopHeight : p.shapeDividerBottomHeight) ?? 100} onChange={(v) => set(dividerTab === "top" ? { shapeDividerTopHeight: v } : { shapeDividerBottomHeight: v })} min={0} max={500} />
            </>
          )}
        </div>
      </div>

      {/* Typography */}
      <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
        <span className={labelCls}>Typography</span>
        <div className="mt-2 space-y-3">
          <GlobalColorPicker label="Text Color" value={p.textColor} onChange={(c) => set({ textColor: c || undefined })} allowClear paletteOverride={themeColors} />
          <GlobalColorPicker label="Link Color" value={p.linkColor} onChange={(c) => set({ linkColor: c || undefined })} allowClear paletteOverride={themeColors} />
          <GlobalColorPicker label="Link Hover Color" value={p.linkHoverColor} onChange={(c) => set({ linkHoverColor: c || undefined })} allowClear paletteOverride={themeColors} />
          <div>
            <span className={labelCls}>Text Align</span>
            <div className="mt-1 flex gap-1">
              {[
                { value: "left", icon: "≡", label: "Left" },
                { value: "center", icon: "≡", label: "Center" },
                { value: "right", icon: "≡", label: "Right" },
                { value: "justify", icon: "≡", label: "Justify" },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => set({ textAlign: opt.value })} className={iconBtn((p.textAlign ?? "left") === opt.value)} title={opt.label}>{opt.icon}</button>
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

function AdvancedTab({ block, onChange }: { block: RowBlock; onChange: (p: RowBlock["props"]) => void }) {
  const [marginLinked, setMarginLinked] = useState(true);
  const [paddingLinked, setPaddingLinked] = useState(true);
  const [openSection, setOpenSection] = useState<string | null>("advanced");
  const p = block.props;

  const margin: SpacingValues = p.margin ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const padding: SpacingValues = p.padding ?? {
    top: p.paddingY ?? 0,
    right: 0,
    bottom: p.paddingY ?? 0,
    left: 0,
  };

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
          <SpacingInput label="Margin" value={margin} onChange={(v) => onChange({ ...p, margin: v })} linked={marginLinked} onToggleLinked={() => setMarginLinked(!marginLinked)} />
          <SpacingInput label="Padding" value={padding} onChange={(v) => onChange({ ...p, padding: v, paddingY: v.top })} linked={paddingLinked} onToggleLinked={() => setPaddingLinked(!paddingLinked)} />

          <div className="border-t border-zinc-200 pt-3">
            <NumberSlider label="Z-Index" value={p.zindex ?? 0} onChange={(v) => onChange({ ...p, zindex: v })} min={0} max={9999} suffix="" />
          </div>

          <div>
            <span className={labelCls}>CSS ID</span>
            <input type="text" value={p.cssId ?? ""} onChange={(e) => onChange({ ...p, cssId: e.target.value })} placeholder="my-row" className={inputCls} />
          </div>

          <div>
            <span className={labelCls}>CSS Classes</span>
            <input type="text" value={p.cssClasses ?? ""} onChange={(e) => onChange({ ...p, cssClasses: e.target.value })} placeholder="custom-class" className={inputCls} />
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
            <button type="button" onClick={() => onChange({ ...p, scrollingEffects: !p.scrollingEffects })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p.scrollingEffects ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${p.scrollingEffects ? "translate-x-6" : "translate-x-1"}`} />
              <span className={`absolute text-[9px] font-medium ${p.scrollingEffects ? "right-1 text-white" : "left-1.5 text-zinc-600"}`}>{p.scrollingEffects ? "On" : "Off"}</span>
            </button>
          </div>

          <div>
            <span className={labelCls}>Sticky</span>
            <select value={p.sticky ?? "none"} onChange={(e) => onChange({ ...p, sticky: e.target.value as "none" | "top" | "bottom" })} className={inputCls}>
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
            <select value={p.entranceAnimation ?? ""} onChange={(e) => onChange({ ...p, entranceAnimation: e.target.value || undefined })} className={inputCls}>
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
            <button type="button" onClick={() => onChange({ ...p, reverseColumnsTablet: !p.reverseColumnsTablet })} className={`relative h-6 w-11 rounded-full transition-colors ${p.reverseColumnsTablet ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${p.reverseColumnsTablet ? "translate-x-5" : ""}`} />
              <span className={`absolute text-[9px] font-medium ${p.reverseColumnsTablet ? "right-1 text-white" : "left-1.5 text-zinc-600"}`}>{p.reverseColumnsTablet ? "Yes" : "No"}</span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className={labelCls}>Reverse Columns (Mobile Portrait)</span>
            <button type="button" onClick={() => onChange({ ...p, reverseColumnsMobile: !p.reverseColumnsMobile })} className={`relative h-6 w-11 rounded-full transition-colors ${p.reverseColumnsMobile ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${p.reverseColumnsMobile ? "translate-x-5" : ""}`} />
              <span className={`absolute text-[9px] font-medium ${p.reverseColumnsMobile ? "right-1 text-white" : "left-1.5 text-zinc-600"}`}>{p.reverseColumnsMobile ? "Yes" : "No"}</span>
            </button>
          </div>

          <div className="border-t border-zinc-200 pt-3">
            <span className="text-xs font-semibold text-zinc-700">Visibility</span>
            <p className="mt-1 text-[10px] text-zinc-400">Responsive visibility will take effect only on <span className="text-zinc-500 underline">preview mode</span> or live page.</p>
          </div>

          <div className="flex items-center justify-between">
            <span className={labelCls}>Hide On Desktop</span>
            <button type="button" onClick={() => onChange({ ...p, hideOnDesktop: !p.hideOnDesktop })} className={`relative h-6 w-11 rounded-full transition-colors ${p.hideOnDesktop ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${p.hideOnDesktop ? "translate-x-5" : ""}`} />
              <span className={`absolute text-[9px] font-medium ${p.hideOnDesktop ? "right-1 text-white" : "left-1.5 text-zinc-600"}`}>{p.hideOnDesktop ? "Hide" : "Show"}</span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className={labelCls}>Hide On Tablet Portrait</span>
            <button type="button" onClick={() => onChange({ ...p, hideOnTablet: !p.hideOnTablet })} className={`relative h-6 w-11 rounded-full transition-colors ${p.hideOnTablet ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${p.hideOnTablet ? "translate-x-5" : ""}`} />
              <span className={`absolute text-[9px] font-medium ${p.hideOnTablet ? "right-1 text-white" : "left-1.5 text-zinc-600"}`}>{p.hideOnTablet ? "Hide" : "Show"}</span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className={labelCls}>Hide On Mobile Portrait</span>
            <button type="button" onClick={() => onChange({ ...p, hideOnMobile: !p.hideOnMobile })} className={`relative h-6 w-11 rounded-full transition-colors ${p.hideOnMobile ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${p.hideOnMobile ? "translate-x-5" : ""}`} />
              <span className={`absolute text-[9px] font-medium ${p.hideOnMobile ? "right-1 text-white" : "left-1.5 text-zinc-600"}`}>{p.hideOnMobile ? "Hide" : "Show"}</span>
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
            <textarea className={`${inputCls} font-mono text-xs`} rows={3} value={p.customAttributes ?? ""} onChange={(e) => onChange({ ...p, customAttributes: e.target.value })} placeholder={"key|value\nkey2|value2"} />
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
          <textarea className={`${inputCls} min-h-[120px] font-mono text-xs`} rows={6} value={p.customCss ?? ""} onChange={(e) => onChange({ ...p, customCss: e.target.value })} placeholder={".selector { color: red; }"} />
          <p className="text-[10px] leading-snug text-zinc-400">
            Use <span className="font-semibold">custom CSS</span> to style your content or add the &quot;selector&quot; prefix to target specific elements.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Main RowEditor ──────────────────────────────────────────────────────── */

type Tab = "layout" | "style" | "advanced";

export default function RowEditor({ block, onChange, onRemove, onDuplicate, onAddColumn, themeColors }: Props) {
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
          Row · {block.props.columns.length} col
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
        <button onClick={onAddColumn} className="w-full rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50">
          + Add Column
        </button>
      </div>
    </div>
  );
}
