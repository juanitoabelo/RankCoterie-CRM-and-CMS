"use client";

import { useState } from "react";
import type { HeaderFooterBlock } from "@/lib/header-footer/types";
import type { ColumnData } from "@/lib/page-builder/types";
import GlobalColorPicker from "./GlobalColorPicker";
import BuilderImageUploader from "./BuilderImageUploader";
import RichTextEditor from "../page-builder/RichTextEditor";
import { SizeInput, SpacingInput } from "../page-builder/settings";
import type { SizeValue, SpacingValues } from "../page-builder/settings";
import RowEditor from "./RowEditor";
import SectionEditor from "./SectionEditor";

type ThemeColor = { key: string; label: string; color: string };

type EditorProps = {
  block: HeaderFooterBlock;
  onChange: (props: HeaderFooterBlock["props"]) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdateColumn: (columnId: string, patch: Record<string, unknown>) => void;
  themeColors?: ThemeColor[];
};

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-xs font-medium text-zinc-600";

/** Helper to create a setter that merges props and calls onChange with proper typing */
function createSetter(block: HeaderFooterBlock, onChange: EditorProps["onChange"]) {
  return (patch: Record<string, unknown>) => onChange({ ...block.props, ...patch } as HeaderFooterBlock["props"]);
}

/* ── Logo Editor ──────────────────────────────────────────────────────── */

function LogoEditor({ block, onChange }: EditorProps) {
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const [styleState, setStyleState] = useState<"normal" | "hover">("normal");

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        {(["content", "style", "advanced"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-xs font-medium capitalize ${activeTab === tab ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content Tab */}
      {activeTab === "content" && (
        <div className="space-y-3">
          <BuilderImageUploader label="Choose Image" value={(p.src as string) || ""} onChange={(url) => set({ src: url })} />
          <label className={labelCls}>Alt Text
            <input type="text" value={(p.alt as string) || ""} onChange={(e) => set({ alt: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>Link To
            <input type="text" value={(p.linkTo as string) || "/"} onChange={(e) => set({ linkTo: e.target.value })} placeholder="/" className={inputCls} />
          </label>
          <label className={labelCls}>Image Resolution
            <select value={(p.imageResolution as string) ?? "full"} onChange={(e) => set({ imageResolution: e.target.value })} className={inputCls}>
              <option value="full">Full</option>
              <option value="large">Large</option>
              <option value="medium">Medium</option>
              <option value="thumbnail">Thumbnail</option>
            </select>
          </label>
          <label className={labelCls}>Link
            <select value={(p.linkType as string) ?? "none"} onChange={(e) => set({ linkType: e.target.value })} className={inputCls}>
              <option value="none">None</option>
              <option value="custom">Custom URL</option>
              <option value="media">Media File</option>
            </select>
          </label>
          {(p.linkType as string) === "custom" && (
            <label className={labelCls}>Link URL
              <input type="url" value={(p.linkUrl as string) || ""} onChange={(e) => set({ linkUrl: e.target.value })} placeholder="https://..." className={inputCls} />
            </label>
          )}
        </div>
      )}

      {/* Style Tab */}
      {activeTab === "style" && (
        <div className="space-y-4">
          <div>
            <span className={labelCls}>Alignment</span>
            <div className="mt-1 flex gap-1">
              {[
                { value: "left", icon: "⫷", label: "Left" },
                { value: "center", icon: "☰", label: "Center" },
                { value: "right", icon: "⫸", label: "Right" },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => set({ alignment: opt.value })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${((p.alignment as string) ?? "left") === opt.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title={opt.label}>{opt.icon}</button>
              ))}
            </div>
          </div>

          <SizeInput
            label="Width"
            value={(p.imageWidth as SizeValue) ?? { value: 100, unit: "%" }}
            onChange={(v) => set({ imageWidth: v })}
            min={10}
            max={100}
          />

          <SizeInput
            label="Max Width"
            value={(p.imageMaxWidth as SizeValue) ?? { value: 0, unit: "px" }}
            onChange={(v) => set({ imageMaxWidth: v })}
            min={0}
            max={2000}
          />

          <SizeInput
            label="Height"
            value={(p.imageHeight as SizeValue) ?? { value: 0, unit: "px" }}
            onChange={(v) => set({ imageHeight: v })}
            min={0}
            max={2000}
          />

          <SizeInput
            label="Max Height"
            value={(p.imageMaxHeight as SizeValue) ?? { value: 0, unit: "px" }}
            onChange={(v) => set({ imageMaxHeight: v })}
            min={0}
            max={2000}
          />

          <div className="border-t border-zinc-200 pt-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => setStyleState("normal")} className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${styleState === "normal" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600"}`}>Normal</button>
              <button type="button" onClick={() => setStyleState("hover")} className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${styleState === "hover" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600"}`}>Hover</button>
            </div>
          </div>

          {styleState === "hover" ? (
            <div>
              <div className="flex items-center justify-between">
                <span className={labelCls}>Hover Opacity</span>
                <span className="text-[10px] text-zinc-400">%</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input type="range" min={0} max={100} className="h-1 flex-1 accent-zinc-900" value={(p.hoverOpacity as number) ?? 100} onChange={(e) => set({ hoverOpacity: Number(e.target.value) })} />
                <input type="number" min={0} max={100} className="w-14 rounded border border-zinc-300 px-2 py-1 text-right text-xs" value={(p.hoverOpacity as number) ?? 100} onChange={(e) => set({ hoverOpacity: Number(e.target.value) })} />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <span className={labelCls}>Opacity</span>
                <span className="text-[10px] text-zinc-400">%</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input type="range" min={0} max={100} className="h-1 flex-1 accent-zinc-900" value={(p.opacity as number) ?? 100} onChange={(e) => set({ opacity: Number(e.target.value) })} />
                <input type="number" min={0} max={100} className="w-14 rounded border border-zinc-300 px-2 py-1 text-right text-xs" value={(p.opacity as number) ?? 100} onChange={(e) => set({ opacity: Number(e.target.value) })} />
              </div>
            </div>
          )}
          <div className="border-t border-zinc-200 pt-3">
            <span className={labelCls}>Border Type</span>
            <select value={(p.borderStyle as string) ?? "none"} onChange={(e) => set({ borderStyle: e.target.value })} className={inputCls}>
              <option value="none">Default</option>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>

          {(p.borderStyle as string) !== "none" && (
            <>
              <SizeInput
                label="Border Width"
                value={(p.borderWidth as SizeValue) ?? { value: 1, unit: "px" }}
                onChange={(v) => set({ borderWidth: v })}
                min={0}
                max={20}
                showSlider={false}
              />
              <label className={labelCls}>Border Color
                <input type="color" className="mt-1 h-10 w-full rounded-lg border border-zinc-300" value={(p.borderColor as string) ?? "#000000"} onChange={(e) => set({ borderColor: e.target.value })} />
              </label>
            </>
          )}

          <div>
            <span className={labelCls}>Border Radius</span>
            <div className="mt-1 grid grid-cols-4 gap-2">
              <div>
                <input type="number" min={0} max={100} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" value={(p.borderRadiusTop as number) ?? 0} onChange={(e) => set({ borderRadiusTop: Number(e.target.value) })} />
                <span className="block text-center text-[9px] text-zinc-400">Top</span>
              </div>
              <div>
                <input type="number" min={0} max={100} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" value={(p.borderRadiusRight as number) ?? 0} onChange={(e) => set({ borderRadiusRight: Number(e.target.value) })} />
                <span className="block text-center text-[9px] text-zinc-400">Right</span>
              </div>
              <div>
                <input type="number" min={0} max={100} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" value={(p.borderRadiusBottom as number) ?? 0} onChange={(e) => set({ borderRadiusBottom: Number(e.target.value) })} />
                <span className="block text-center text-[9px] text-zinc-400">Bottom</span>
              </div>
              <div>
                <input type="number" min={0} max={100} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" value={(p.borderRadiusLeft as number) ?? 0} onChange={(e) => set({ borderRadiusLeft: Number(e.target.value) })} />
                <span className="block text-center text-[9px] text-zinc-400">Left</span>
              </div>
            </div>
          </div>

          <label className={labelCls}>Box Shadow
            <select value={(p.boxShadow as string) ?? ""} onChange={(e) => set({ boxShadow: e.target.value || undefined })} className={inputCls}>
              <option value="">None</option>
              <option value="0 1px 3px rgba(0,0,0,0.12)">Subtle</option>
              <option value="0 4px 6px rgba(0,0,0,0.1)">Medium</option>
              <option value="0 10px 15px rgba(0,0,0,0.1)">Large</option>
              <option value="0 20px 25px rgba(0,0,0,0.15)">Extra Large</option>
            </select>
          </label>
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === "advanced" && (
        <div className="space-y-3">
          <SpacingInput label="Margin" value={(p.margin as SpacingValues) ?? { top: 0, right: 0, bottom: 0, left: 0 }} onChange={(v) => set({ margin: v })} linked={false} onToggleLinked={() => {}} />
          <SpacingInput label="Padding" value={(p.padding as SpacingValues) ?? { top: 0, right: 0, bottom: 0, left: 0 }} onChange={(v) => set({ padding: v })} linked={false} onToggleLinked={() => {}} />

          <label className={labelCls}>Align Self
            <select value={(p.alignSelf as string) ?? "auto"} onChange={(e) => set({ alignSelf: e.target.value })} className={inputCls}>
              <option value="auto">Default</option>
              <option value="flex-start">Start</option>
              <option value="center">Center</option>
              <option value="flex-end">End</option>
              <option value="stretch">Stretch</option>
            </select>
          </label>

          <label className={labelCls}>Z-Index
            <input type="number" min={0} max={9999} className={inputCls} value={(p.zIndex as number) ?? 0} onChange={(e) => set({ zIndex: Number(e.target.value) })} />
          </label>

          <label className={labelCls}>CSS ID
            <input type="text" className={inputCls} value={(p.cssId as string) || ""} onChange={(e) => set({ cssId: e.target.value })} placeholder="my-logo" />
          </label>

          <label className={labelCls}>CSS Classes
            <input type="text" className={inputCls} value={(p.cssClasses as string) || ""} onChange={(e) => set({ cssClasses: e.target.value })} placeholder="custom-class" />
          </label>
        </div>
      )}
    </div>
  );
}

/* ── Menu Editor ──────────────────────────────────────────────────────── */

function MenuEditor({ block, onChange, themeColors }: EditorProps) {
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        {(["content", "style", "advanced"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-xs font-medium capitalize ${activeTab === tab ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Content Tab ─────────────────────────────────────────── */}
      {activeTab === "content" && (
        <div className="space-y-3">
          <label className={labelCls}>Menu Name
            <input type="text" className={inputCls} value={(p.menuName as string) || ""} onChange={(e) => set({ menuName: e.target.value })} placeholder="Menu" />
          </label>

          <label className={labelCls}>Menu
            <select value={(p.menuId as string) || "header"} onChange={(e) => set({ menuId: e.target.value })} className={inputCls}>
              <option value="header">Header Menu</option>
              <option value="footer">Footer Menu</option>
            </select>
          </label>
          <p className="text-[11px] text-zinc-400">
            Create and manage menus in <strong>Admin → Menus</strong>. Select which menu location to display here.
          </p>

          {/* Layout section */}
          <div className="border-t border-zinc-200 pt-3">
            <span className={labelCls}>Layout</span>
            <select value={(p.orientation as string) || "horizontal"} onChange={(e) => set({ orientation: e.target.value })} className={inputCls}>
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
          </div>

          {/* Alignment buttons */}
          <div>
            <span className={labelCls}>Alignment</span>
            <div className="mt-1 flex gap-1">
              {[
                { value: "left", icon: "⫷", label: "Left" },
                { value: "center", icon: "☰", label: "Center" },
                { value: "right", icon: "⫸", label: "Right" },
                { value: "between", icon: "⫘", label: "Justified" },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => set({ align: opt.value })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${((p.align as string) ?? "left") === opt.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title={opt.label}>{opt.icon}</button>
              ))}
            </div>
          </div>

          {/* Pointer */}
          <div className="border-t border-zinc-200 pt-3">
            <span className={labelCls}>Pointer</span>
            <select value={(p.pointer as string) || "underline"} onChange={(e) => set({ pointer: e.target.value })} className={inputCls}>
              <option value="none">None</option>
              <option value="underline">Underline</option>
              <option value="framed">Framed</option>
              <option value="background">Background</option>
              <option value="double">Double</option>
            </select>
          </div>

          {/* Animation */}
          <label className={labelCls}>Animation
            <select value={(p.animation as string) || "fade"} onChange={(e) => set({ animation: e.target.value })} className={inputCls}>
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="grow">Grow</option>
            </select>
          </label>

          {/* Mobile Dropdown section */}
          <div className="border-t border-zinc-200 pt-3">
            <span className="text-xs font-semibold text-zinc-700">Mobile Dropdown</span>
          </div>

          <label className={labelCls}>Breakpoint (px)
            <input type="number" className={inputCls} value={(p.mobileBreakpoint as number) ?? 1024} onChange={(e) => set({ mobileBreakpoint: Number(e.target.value) })} min={480} max={1920} />
          </label>

          <div className="flex items-center justify-between">
            <span className={labelCls}>Full Width</span>
            <button type="button" onClick={() => set({ fullMobileWidth: !(p.fullMobileWidth as boolean) })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${(p.fullMobileWidth as boolean) ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${(p.fullMobileWidth as boolean) ? "translate-x-4.5" : "translate-x-0.5"}`} />
            </button>
          </div>

          <label className={labelCls}>Text Align
            <select value={(p.mobileTextAlign as string) || "left"} onChange={(e) => set({ mobileTextAlign: e.target.value })} className={inputCls}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>

          <label className={labelCls}>Toggle Button
            <select value={(p.toggleButton as string) || "hamburger"} onChange={(e) => set({ toggleButton: e.target.value })} className={inputCls}>
              <option value="hamburger">Hamburger</option>
              <option value="classic">Classic</option>
              <option value="bubble">Bubble</option>
            </select>
          </label>

          {/* Toggle Align */}
          <div>
            <span className={labelCls}>Toggle Align</span>
            <div className="mt-1 flex gap-1">
              {[
                { value: "left", icon: "⫷", label: "Left" },
                { value: "center", icon: "☰", label: "Center" },
                { value: "right", icon: "⫸", label: "Right" },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => set({ toggleAlign: opt.value })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${((p.toggleAlign as string) ?? "right") === opt.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title={opt.label}>{opt.icon}</button>
              ))}
            </div>
          </div>

          {/* Icon selector placeholder */}
          <div>
            <span className={labelCls}>Icon</span>
            <div className="mt-1 flex gap-1">
              {["≡", "☰", "MenuBar"].map((icon, i) => (
                <button key={i} type="button" className="flex h-8 w-8 items-center justify-center rounded border border-zinc-300 bg-white text-sm text-zinc-600 hover:bg-zinc-100">{icon}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Style Tab ─────────────────────────────────────────── */}
      {activeTab === "style" && (
        <div className="space-y-3">
          {/* Main Menu section */}
          <div className="border-t border-zinc-200 pt-3">
            <span className="text-xs font-semibold text-zinc-700">Main Menu</span>
          </div>

          {/* Typography */}
          <div>
            <span className={labelCls}>Typography</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <select value={(p.fontFamily as string) || ""} onChange={(e) => set({ fontFamily: e.target.value })} className={inputCls}>
                <option value="">Default</option>
                <option value="inherit">Inherit</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Times New Roman, serif">Times</option>
                <option value="Courier New, monospace">Courier</option>
                <option value="Verdana, sans-serif">Verdana</option>
              </select>
              <select value={(p.fontWeight as string) || ""} onChange={(e) => set({ fontWeight: e.target.value })} className={inputCls}>
                <option value="">Default</option>
                <option value="300">Light</option>
                <option value="400">Regular</option>
                <option value="500">Medium</option>
                <option value="600">Semibold</option>
                <option value="700">Bold</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className={labelCls}>Font Size
              <input type="number" className={inputCls} value={(p.fontSize as number) || 16} onChange={(e) => set({ fontSize: Number(e.target.value) || 16 })} min={10} max={32} />
            </label>
            <label className={labelCls}>Weight
              <select value={(p.fontWeight as string) || ""} onChange={(e) => set({ fontWeight: e.target.value })} className={inputCls}>
                <option value="">Default</option>
                <option value="300">300</option>
                <option value="400">400</option>
                <option value="500">500</option>
                <option value="600">600</option>
                <option value="700">700</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className={labelCls}>Text Transform
              <select value={(p.textTransform as string) || "none"} onChange={(e) => set({ textTransform: e.target.value })} className={inputCls}>
                <option value="none">None</option>
                <option value="uppercase">Uppercase</option>
                <option value="lowercase">Lowercase</option>
                <option value="capitalize">Capitalize</option>
              </select>
            </label>
            <label className={labelCls}>Letter Spacing
              <input type="number" className={inputCls} value={(p.letterSpacing as number) ?? 0} onChange={(e) => set({ letterSpacing: Number(e.target.value) })} min={-5} max={20} step={0.5} />
            </label>
          </div>

          {/* Text Color with Normal/Hover/Active */}
          <div className="border-t border-zinc-200 pt-3">
            <span className={labelCls}>Text Color</span>
            <div className="mt-1 grid grid-cols-3 gap-1">
              <GlobalColorPicker label="Normal" value={p.textColor as string} onChange={(c) => set({ textColor: c })} paletteOverride={themeColors} />
              <GlobalColorPicker label="Hover" value={p.hoverColor as string} onChange={(c) => set({ hoverColor: c })} paletteOverride={themeColors} />
              <GlobalColorPicker label="Active" value={p.activeColor as string} onChange={(c) => set({ activeColor: c })} paletteOverride={themeColors} />
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center justify-between">
            <span className={labelCls}>Divider</span>
            <button type="button" onClick={() => set({ pointer: (p.pointer as string) === "none" ? "underline" : "none" })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${(p.pointer as string) !== "none" ? "bg-zinc-900" : "bg-zinc-300"}`}>
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${(p.pointer as string) !== "none" ? "translate-x-4.5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Pointer Width */}
          {(p.pointer as string) !== "none" && (
            <div>
              <div className="flex items-center justify-between">
                <span className={labelCls}>Pointer Width</span>
                <span className="text-[10px] text-zinc-400">px</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input type="range" min={1} max={10} className="h-1 flex-1 accent-zinc-900" value={(p.pointerWidth as number) ?? 2} onChange={(e) => set({ pointerWidth: Number(e.target.value) })} />
                <input type="number" min={1} max={10} className="w-14 rounded border border-zinc-300 px-2 py-1 text-right text-xs" value={(p.pointerWidth as number) ?? 2} onChange={(e) => set({ pointerWidth: Number(e.target.value) })} />
              </div>
            </div>
          )}

          {/* Pointer Color */}
          {(p.pointer as string) !== "none" && (
            <GlobalColorPicker label="Pointer Color" value={p.pointerColor as string} onChange={(c) => set({ pointerColor: c })} paletteOverride={themeColors} />
          )}

          {/* Horizontal Padding */}
          <div>
            <div className="flex items-center justify-between">
              <span className={labelCls}>Horizontal Padding</span>
              <span className="text-[10px] text-zinc-400">px</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input type="range" min={0} max={60} className="h-1 flex-1 accent-zinc-900" value={(p.hPadding as number) ?? 12} onChange={(e) => set({ hPadding: Number(e.target.value) })} />
              <input type="number" min={0} max={60} className="w-14 rounded border border-zinc-300 px-2 py-1 text-right text-xs" value={(p.hPadding as number) ?? 12} onChange={(e) => set({ hPadding: Number(e.target.value) })} />
            </div>
          </div>

          {/* Vertical Padding */}
          <div>
            <div className="flex items-center justify-between">
              <span className={labelCls}>Vertical Padding</span>
              <span className="text-[10px] text-zinc-400">px</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input type="range" min={0} max={40} className="h-1 flex-1 accent-zinc-900" value={(p.vPadding as number) ?? 8} onChange={(e) => set({ vPadding: Number(e.target.value) })} />
              <input type="number" min={0} max={40} className="w-14 rounded border border-zinc-300 px-2 py-1 text-right text-xs" value={(p.vPadding as number) ?? 8} onChange={(e) => set({ vPadding: Number(e.target.value) })} />
            </div>
          </div>

          {/* Space Between */}
          <div>
            <div className="flex items-center justify-between">
              <span className={labelCls}>Space Between</span>
              <span className="text-[10px] text-zinc-400">px</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input type="range" min={0} max={60} className="h-1 flex-1 accent-zinc-900" value={(p.spaceBetween as number) ?? 24} onChange={(e) => set({ spaceBetween: Number(e.target.value) })} />
              <input type="number" min={0} max={60} className="w-14 rounded border border-zinc-300 px-2 py-1 text-right text-xs" value={(p.spaceBetween as number) ?? 24} onChange={(e) => set({ spaceBetween: Number(e.target.value) })} />
            </div>
          </div>

          {/* Dropdown section */}
          <div className="border-t border-zinc-200 pt-3">
            <span className="text-xs font-semibold text-zinc-700">Dropdown</span>
          </div>

          <GlobalColorPicker label="Background Color" value={p.dropdownBgColor as string} onChange={(c) => set({ dropdownBgColor: c })} paletteOverride={themeColors} />
          <GlobalColorPicker label="Text Color" value={p.dropdownTextColor as string} onChange={(c) => set({ dropdownTextColor: c })} paletteOverride={themeColors} />
          <GlobalColorPicker label="Hover Color" value={p.dropdownHoverColor as string} onChange={(c) => set({ dropdownHoverColor: c })} paletteOverride={themeColors} />

          {/* Toggle Button section */}
          <div className="border-t border-zinc-200 pt-3">
            <span className="text-xs font-semibold text-zinc-700">Toggle Button</span>
          </div>

          <GlobalColorPicker label="Color" value={p.toggleColor as string} onChange={(c) => set({ toggleColor: c })} paletteOverride={themeColors} />

          <div>
            <div className="flex items-center justify-between">
              <span className={labelCls}>Size</span>
              <span className="text-[10px] text-zinc-400">px</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input type="range" min={16} max={48} className="h-1 flex-1 accent-zinc-900" value={(p.toggleSize as number) ?? 24} onChange={(e) => set({ toggleSize: Number(e.target.value) })} />
              <input type="number" min={16} max={48} className="w-14 rounded border border-zinc-300 px-2 py-1 text-right text-xs" value={(p.toggleSize as number) ?? 24} onChange={(e) => set({ toggleSize: Number(e.target.value) })} />
            </div>
          </div>
        </div>
      )}

      {/* ── Advanced Tab ─────────────────────────────────────────── */}
      {activeTab === "advanced" && (
        <div className="space-y-3">
          <div className="border-t border-zinc-200 pt-3">
            <span className="text-xs font-semibold text-zinc-700">Layout</span>
          </div>

          <label className={labelCls}>Width
            <select value={(p.width as string) || "default"} onChange={(e) => set({ width: e.target.value })} className={inputCls}>
              <option value="default">Default</option>
              <option value="full">Full Width</option>
              <option value="boxed">Boxed</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <label className={labelCls}>Z-Index
            <input type="number" className={inputCls} value={(p.zIndex as number) ?? ""} onChange={(e) => set({ zIndex: e.target.value ? Number(e.target.value) : undefined })} placeholder="Auto" />
          </label>

          <label className={labelCls}>CSS ID
            <input type="text" className={inputCls} value={(p.cssId as string) || ""} onChange={(e) => set({ cssId: e.target.value })} placeholder="my-menu" />
          </label>

          <label className={labelCls}>CSS Classes
            <input type="text" className={inputCls} value={(p.cssClasses as string) || ""} onChange={(e) => set({ cssClasses: e.target.value })} placeholder="custom-menu-class" />
          </label>
        </div>
      )}
    </div>
  );
}

/* ── Social Icons Editor ──────────────────────────────────────────────── */

function SocialIconsEditor({ block, onChange, themeColors }: EditorProps) {
  const p = block.props as {
    icons: Array<{ platform: string; url: string; label: string }>;
    style: "filled" | "outlined" | "minimal";
    size: "sm" | "md" | "lg";
    color: string;
    hoverColor: string;
    gap: number;
  };
  const updateIcon = (i: number, patch: Record<string, string>) => {
    const icons = [...p.icons];
    icons[i] = { ...icons[i], ...patch };
    onChange({ ...p, icons });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {p.icons.map((icon, i) => (
          <div key={i} className="flex gap-2">
            <select value={icon.platform} onChange={(e) => updateIcon(i, { platform: e.target.value })} className="w-24 rounded border border-zinc-300 px-2 py-1.5 text-xs">
              <option value="facebook">Facebook</option>
              <option value="twitter">Twitter</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
              <option value="pinterest">Pinterest</option>
              <option value="tiktok">TikTok</option>
              <option value="github">GitHub</option>
              <option value="custom">Custom</option>
            </select>
            <input type="url" value={icon.url} onChange={(e) => updateIcon(i, { url: e.target.value })} placeholder="https://..." className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-xs" />
            <button onClick={() => onChange({ ...p, icons: p.icons.filter((_, j) => j !== i) })} className="rounded px-2 text-xs text-red-500 hover:bg-red-50">✕</button>
          </div>
        ))}
      </div>
      <button onClick={() => onChange({ ...p, icons: [...p.icons, { platform: "custom", url: "", label: "" }] })} className="w-full rounded border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50">+ Add Icon</button>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>Style
          <select value={p.style} onChange={(e) => onChange({ ...p, style: e.target.value as "filled" | "outlined" | "minimal" })} className={inputCls}>
            <option value="filled">Filled</option>
            <option value="outlined">Outlined</option>
            <option value="minimal">Minimal</option>
          </select>
        </label>
        <label className={labelCls}>Size
          <select value={p.size} onChange={(e) => onChange({ ...p, size: e.target.value as "sm" | "md" | "lg" })} className={inputCls}>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <GlobalColorPicker label="Color" value={p.color} onChange={(c) => onChange({ ...p, color: c })} paletteOverride={themeColors} />
        <GlobalColorPicker label="Hover Color" value={p.hoverColor} onChange={(c) => onChange({ ...p, hoverColor: c })} paletteOverride={themeColors} />
      </div>
      <label className={labelCls}>Gap (px)
        <input type="number" value={p.gap} onChange={(e) => onChange({ ...p, gap: Number(e.target.value) || 16 })} min={0} max={48} className={inputCls} />
      </label>
    </div>
  );
}

/* ── Contact Info Editor ──────────────────────────────────────────────── */

function ContactInfoEditor({ block, onChange, themeColors }: EditorProps) {
  const p = block.props as {
    showPhone: boolean; showEmail: boolean; showAddress: boolean; showHours: boolean;
    phone: string; email: string; address: string; hours: string;
    separator: string; iconStyle: string; textColor?: string; fontSize?: number;
  };
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: "showPhone", label: "Phone" },
          { key: "showEmail", label: "Email" },
          { key: "showAddress", label: "Address" },
          { key: "showHours", label: "Hours" },
        ].map((item) => (
          <label key={item.key} className="flex items-center gap-2 text-xs text-zinc-600">
            <input type="checkbox" checked={p[item.key as keyof typeof p] as boolean} onChange={(e) => set({ [item.key]: e.target.checked })} className="accent-amber-600" />
            {item.label}
          </label>
        ))}
      </div>
      {p.showPhone && <label className={labelCls}>Phone<input type="tel" value={p.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="(555) 123-4567" className={inputCls} /></label>}
      {p.showEmail && <label className={labelCls}>Email<input type="email" value={p.email} onChange={(e) => set({ email: e.target.value })} placeholder="info@example.com" className={inputCls} /></label>}
      {p.showAddress && <label className={labelCls}>Address<RichTextEditor value={p.address} onChange={(v) => set({ address: v })} minHeight={60} /></label>}
      {p.showHours && <label className={labelCls}>Hours<RichTextEditor value={p.hours} onChange={(v) => set({ hours: v })} minHeight={60} placeholder="Mon-Fri: 9am-5pm" /></label>}
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>Separator
          <select value={p.separator} onChange={(e) => set({ separator: e.target.value })} className={inputCls}>
            <option value="dot">Dot (·)</option>
            <option value="pipe">Pipe (|)</option>
            <option value="space">Space</option>
            <option value="newline">New Line</option>
          </select>
        </label>
        <label className={labelCls}>Icon Style
          <select value={p.iconStyle} onChange={(e) => set({ iconStyle: e.target.value })} className={inputCls}>
            <option value="none">None</option>
            <option value="emoji">Emoji</option>
            <option value="svg">SVG</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <GlobalColorPicker label="Text Color" value={p.textColor} onChange={(c) => set({ textColor: c })} paletteOverride={themeColors} />
        <label className={labelCls}>Font Size (px)
          <input type="number" value={p.fontSize || 14} onChange={(e) => set({ fontSize: Number(e.target.value) || 14 })} min={10} max={32} className={inputCls} />
        </label>
      </div>
    </div>
  );
}

/* ── Search Editor ─────────────────────────────────────────────────────── */

function SearchEditor({ block, onChange, themeColors }: EditorProps) {
  const p = block.props as {
    placeholder: string; style: string; width: number;
    bgColor?: string; borderColor?: string; textColor?: string; borderRadius: number;
  };
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <label className={labelCls}>Placeholder
        <input type="text" value={p.placeholder} onChange={(e) => set({ placeholder: e.target.value })} className={inputCls} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>Style
          <select value={p.style} onChange={(e) => set({ style: e.target.value })} className={inputCls}>
            <option value="minimal">Minimal</option>
            <option value="expanded">Expanded</option>
            <option value="icon-only">Icon Only</option>
          </select>
        </label>
        <label className={labelCls}>Width (px)
          <input type="number" value={p.width} onChange={(e) => set({ width: Number(e.target.value) || 300 })} min={100} max={600} className={inputCls} />
        </label>
      </div>
      <label className={labelCls}>Border Radius (px)
        <input type="number" value={p.borderRadius} onChange={(e) => set({ borderRadius: Number(e.target.value) || 0 })} min={0} max={32} className={inputCls} />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <GlobalColorPicker label="BG Color" value={p.bgColor} onChange={(c) => set({ bgColor: c })} paletteOverride={themeColors} />
        <GlobalColorPicker label="Border Color" value={p.borderColor} onChange={(c) => set({ borderColor: c })} paletteOverride={themeColors} />
        <GlobalColorPicker label="Text Color" value={p.textColor} onChange={(c) => set({ textColor: c })} paletteOverride={themeColors} />
      </div>
    </div>
  );
}

/* ── Hero Editor ──────────────────────────────────────────────────────── */

function HeroEditor({ block, onChange, themeColors }: EditorProps) {
  const p = block.props as { heading: string; subheading: string; bgColor: string; textColor: string };
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <label className={labelCls}>Heading
        <input type="text" value={p.heading} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
      </label>
      <label className={labelCls}>Subheading
        <RichTextEditor value={p.subheading} onChange={(v) => set({ subheading: v })} minHeight={60} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <GlobalColorPicker label="Background" value={p.bgColor} onChange={(c) => set({ bgColor: c })} paletteOverride={themeColors} />
        <GlobalColorPicker label="Text Color" value={p.textColor} onChange={(c) => set({ textColor: c })} paletteOverride={themeColors} />
      </div>
    </div>
  );
}

/* ── Text Editor ──────────────────────────────────────────────────────── */

function TextEditor({ block, onChange }: EditorProps) {
  const p = block.props as { content: string; align: "left" | "center" | "right" };
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <label className={labelCls}>Content
        <RichTextEditor value={p.content} onChange={(v) => set({ content: v })} minHeight={120} />
      </label>
      <label className={labelCls}>Alignment
        <select value={p.align} onChange={(e) => set({ align: e.target.value })} className={inputCls}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
    </div>
  );
}

/* ── Image Editor ─────────────────────────────────────────────────────── */

function ImageEditor({ block, onChange }: EditorProps) {
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const [styleState, setStyleState] = useState<"normal" | "hover">("normal");

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        {(["content", "style", "advanced"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-xs font-medium capitalize ${activeTab === tab ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content Tab */}
      {activeTab === "content" && (
        <div className="space-y-3">
          <BuilderImageUploader label="Choose Image" value={(p.src as string) || ""} onChange={(url) => set({ src: url })} />
          <label className={labelCls}>Alt Text
            <input type="text" value={(p.alt as string) || ""} onChange={(e) => set({ alt: e.target.value })} className={inputCls} />
          </label>
          <label className={labelCls}>Image Resolution
            <select value={(p.imageResolution as string) ?? "full"} onChange={(e) => set({ imageResolution: e.target.value })} className={inputCls}>
              <option value="full">Full</option>
              <option value="large">Large</option>
              <option value="medium">Medium</option>
              <option value="thumbnail">Thumbnail</option>
            </select>
          </label>
          <label className={labelCls}>Caption
            <select value={(p.caption as string) ? "custom" : "none"} onChange={(e) => set({ caption: e.target.value === "none" ? "" : (p.caption as string) || "" })} className={inputCls}>
              <option value="none">None</option>
              <option value="custom">Custom Caption</option>
            </select>
          </label>
          {(p.caption as string) !== undefined && (p.caption as string) !== "" && (
            <label className={labelCls}>Caption Text
              <input type="text" value={p.caption as string} onChange={(e) => set({ caption: e.target.value })} className={inputCls} />
            </label>
          )}
          <label className={labelCls}>Link
            <select value={(p.linkType as string) ?? "none"} onChange={(e) => set({ linkType: e.target.value })} className={inputCls}>
              <option value="none">None</option>
              <option value="custom">Custom URL</option>
              <option value="media">Media File</option>
            </select>
          </label>
          {(p.linkType as string) === "custom" && (
            <label className={labelCls}>Link URL
              <input type="url" value={(p.linkUrl as string) || ""} onChange={(e) => set({ linkUrl: e.target.value })} placeholder="https://..." className={inputCls} />
            </label>
          )}
        </div>
      )}

      {/* Style Tab */}
      {activeTab === "style" && (
        <div className="space-y-4">
          <div>
            <span className={labelCls}>Alignment</span>
            <div className="mt-1 flex gap-1">
              {[
                { value: "left", icon: "⫷", label: "Left" },
                { value: "center", icon: "☰", label: "Center" },
                { value: "right", icon: "⫸", label: "Right" },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => set({ alignment: opt.value })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${((p.alignment as string) ?? "left") === opt.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title={opt.label}>{opt.icon}</button>
              ))}
            </div>
          </div>

          <SizeInput
            label="Width"
            value={(p.imageWidth as SizeValue) ?? { value: 100, unit: "%" }}
            onChange={(v) => set({ imageWidth: v })}
            min={10}
            max={100}
          />

          <SizeInput
            label="Max Width"
            value={(p.imageMaxWidth as SizeValue) ?? { value: 0, unit: "px" }}
            onChange={(v) => set({ imageMaxWidth: v })}
            min={0}
            max={2000}
          />

          <SizeInput
            label="Height"
            value={(p.imageHeight as SizeValue) ?? { value: 0, unit: "px" }}
            onChange={(v) => set({ imageHeight: v })}
            min={0}
            max={2000}
          />

          <SizeInput
            label="Max Height"
            value={(p.imageMaxHeight as SizeValue) ?? { value: 0, unit: "px" }}
            onChange={(v) => set({ imageMaxHeight: v })}
            min={0}
            max={2000}
          />

          <div className="border-t border-zinc-200 pt-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => setStyleState("normal")} className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${styleState === "normal" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600"}`}>Normal</button>
              <button type="button" onClick={() => setStyleState("hover")} className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${styleState === "hover" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600"}`}>Hover</button>
            </div>
          </div>

          {styleState === "hover" ? (
            <div>
              <div className="flex items-center justify-between">
                <span className={labelCls}>Hover Opacity</span>
                <span className="text-[10px] text-zinc-400">%</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input type="range" min={0} max={100} className="h-1 flex-1 accent-zinc-900" value={(p.hoverOpacity as number) ?? 100} onChange={(e) => set({ hoverOpacity: Number(e.target.value) })} />
                <input type="number" min={0} max={100} className="w-14 rounded border border-zinc-300 px-2 py-1 text-right text-xs" value={(p.hoverOpacity as number) ?? 100} onChange={(e) => set({ hoverOpacity: Number(e.target.value) })} />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <span className={labelCls}>Opacity</span>
                <span className="text-[10px] text-zinc-400">%</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input type="range" min={0} max={100} className="h-1 flex-1 accent-zinc-900" value={(p.opacity as number) ?? 100} onChange={(e) => set({ opacity: Number(e.target.value) })} />
                <input type="number" min={0} max={100} className="w-14 rounded border border-zinc-300 px-2 py-1 text-right text-xs" value={(p.opacity as number) ?? 100} onChange={(e) => set({ opacity: Number(e.target.value) })} />
              </div>
            </div>
          )}
          <div className="border-t border-zinc-200 pt-3">
            <span className={labelCls}>Border Type</span>
            <select value={(p.borderStyle as string) ?? "none"} onChange={(e) => set({ borderStyle: e.target.value })} className={inputCls}>
              <option value="none">Default</option>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>

          {(p.borderStyle as string) !== "none" && (
            <>
              <label className={labelCls}>Border Width
                <input type="number" min={0} max={20} className={inputCls} value={(p.borderWidth as number) ?? 1} onChange={(e) => set({ borderWidth: Number(e.target.value) })} />
              </label>
              <label className={labelCls}>Border Color
                <input type="color" className="mt-1 h-10 w-full rounded-lg border border-zinc-300" value={(p.borderColor as string) ?? "#000000"} onChange={(e) => set({ borderColor: e.target.value })} />
              </label>
            </>
          )}

          <div>
            <span className={labelCls}>Border Radius</span>
            <div className="mt-1 grid grid-cols-4 gap-2">
              <div>
                <input type="number" min={0} max={100} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" value={(p.borderRadiusTop as number) ?? 0} onChange={(e) => set({ borderRadiusTop: Number(e.target.value) })} />
                <span className="block text-center text-[9px] text-zinc-400">Top</span>
              </div>
              <div>
                <input type="number" min={0} max={100} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" value={(p.borderRadiusRight as number) ?? 0} onChange={(e) => set({ borderRadiusRight: Number(e.target.value) })} />
                <span className="block text-center text-[9px] text-zinc-400">Right</span>
              </div>
              <div>
                <input type="number" min={0} max={100} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" value={(p.borderRadiusBottom as number) ?? 0} onChange={(e) => set({ borderRadiusBottom: Number(e.target.value) })} />
                <span className="block text-center text-[9px] text-zinc-400">Bottom</span>
              </div>
              <div>
                <input type="number" min={0} max={100} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" value={(p.borderRadiusLeft as number) ?? 0} onChange={(e) => set({ borderRadiusLeft: Number(e.target.value) })} />
                <span className="block text-center text-[9px] text-zinc-400">Left</span>
              </div>
            </div>
          </div>

          <label className={labelCls}>Box Shadow
            <select value={(p.boxShadow as string) ?? ""} onChange={(e) => set({ boxShadow: e.target.value || undefined })} className={inputCls}>
              <option value="">None</option>
              <option value="0 1px 3px rgba(0,0,0,0.12)">Subtle</option>
              <option value="0 4px 6px rgba(0,0,0,0.1)">Medium</option>
              <option value="0 10px 15px rgba(0,0,0,0.1)">Large</option>
              <option value="0 20px 25px rgba(0,0,0,0.15)">Extra Large</option>
            </select>
          </label>
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === "advanced" && (
        <div className="space-y-3">
          <SpacingInput label="Margin" value={(p.margin as SpacingValues) ?? { top: 0, right: 0, bottom: 0, left: 0 }} onChange={(v) => set({ margin: v })} linked={false} onToggleLinked={() => {}} />
          <SpacingInput label="Padding" value={(p.padding as SpacingValues) ?? { top: 0, right: 0, bottom: 0, left: 0 }} onChange={(v) => set({ padding: v })} linked={false} onToggleLinked={() => {}} />

          <label className={labelCls}>Align Self
            <select value={(p.alignSelf as string) ?? "auto"} onChange={(e) => set({ alignSelf: e.target.value })} className={inputCls}>
              <option value="auto">Default</option>
              <option value="flex-start">Start</option>
              <option value="center">Center</option>
              <option value="flex-end">End</option>
              <option value="stretch">Stretch</option>
            </select>
          </label>

          <label className={labelCls}>Z-Index
            <input type="number" min={0} max={9999} className={inputCls} value={(p.zIndex as number) ?? 0} onChange={(e) => set({ zIndex: Number(e.target.value) })} />
          </label>

          <label className={labelCls}>CSS ID
            <input type="text" className={inputCls} value={(p.cssId as string) || ""} onChange={(e) => set({ cssId: e.target.value })} placeholder="my-image" />
          </label>

          <label className={labelCls}>CSS Classes
            <input type="text" className={inputCls} value={(p.cssClasses as string) || ""} onChange={(e) => set({ cssClasses: e.target.value })} placeholder="custom-class" />
          </label>
        </div>
      )}
    </div>
  );
}

/* ── CTA Editor ───────────────────────────────────────────────────────── */

function CtaEditor({ block, onChange, themeColors }: EditorProps) {
  const p = block.props as { heading: string; body: string; buttonText: string; buttonUrl: string; bgColor: string };
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <label className={labelCls}>Heading
        <input type="text" value={p.heading} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
      </label>
      <label className={labelCls}>Body
        <RichTextEditor value={p.body} onChange={(v) => set({ body: v })} minHeight={80} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>Button Text
          <input type="text" value={p.buttonText} onChange={(e) => set({ buttonText: e.target.value })} className={inputCls} />
        </label>
        <label className={labelCls}>Button URL
          <input type="url" value={p.buttonUrl} onChange={(e) => set({ buttonUrl: e.target.value })} placeholder="https://..." className={inputCls} />
        </label>
      </div>
      <GlobalColorPicker label="Background Color" value={p.bgColor} onChange={(c) => set({ bgColor: c })} paletteOverride={themeColors} />
    </div>
  );
}

/* ── Features Editor ──────────────────────────────────────────────────── */

function FeaturesEditor({ block, onChange }: EditorProps) {
  const p = block.props as { heading: string; items: Array<{ icon: string; title: string; description: string }>; columns: 2 | 3 | 4 };
  const updateItem = (i: number, patch: Record<string, string>) => {
    const items = [...p.items];
    items[i] = { ...items[i], ...patch };
    onChange({ ...p, items });
  };

  return (
    <div className="space-y-3">
      <label className={labelCls}>Heading
        <input type="text" value={p.heading} onChange={(e) => onChange({ ...p, heading: e.target.value })} className={inputCls} />
      </label>
      <label className={labelCls}>Columns
        <select value={p.columns} onChange={(e) => onChange({ ...p, columns: Number(e.target.value) as 2 | 3 | 4 })} className={inputCls}>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </label>
      <div className="space-y-2">
        {p.items.map((item, i) => (
          <div key={i} className="rounded border border-zinc-200 p-2 space-y-2">
            <div className="flex gap-2">
              <input type="text" value={item.icon} onChange={(e) => updateItem(i, { icon: e.target.value })} placeholder="Icon" className="w-16 rounded border border-zinc-300 px-2 py-1 text-xs" />
              <input type="text" value={item.title} onChange={(e) => updateItem(i, { title: e.target.value })} placeholder="Title" className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs" />
              <button onClick={() => onChange({ ...p, items: p.items.filter((_, j) => j !== i) })} className="text-red-500 hover:text-red-700 text-xs">✕</button>
            </div>
            <RichTextEditor value={item.description} onChange={(v) => updateItem(i, { description: v })} minHeight={50} placeholder="Description" />
          </div>
        ))}
      </div>
      <button onClick={() => onChange({ ...p, items: [...p.items, { icon: "", title: "", description: "" }] })} className="w-full rounded border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50">+ Add Feature</button>
    </div>
  );
}

/* ── Button Editor ────────────────────────────────────────────────────── */

function ButtonEditor({ block, onChange }: EditorProps) {
  const p = block.props as { text: string; url: string; align: "left" | "center" | "right"; variant: "solid" | "outline" };
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <label className={labelCls}>Text
        <input type="text" value={p.text} onChange={(e) => set({ text: e.target.value })} className={inputCls} />
      </label>
      <label className={labelCls}>URL
        <input type="url" value={p.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://..." className={inputCls} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>Alignment
          <select value={p.align} onChange={(e) => set({ align: e.target.value })} className={inputCls}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
        <label className={labelCls}>Variant
          <select value={p.variant} onChange={(e) => set({ variant: e.target.value })} className={inputCls}>
            <option value="solid">Solid</option>
            <option value="outline">Outline</option>
          </select>
        </label>
      </div>
    </div>
  );
}

/* ── Embed Editor ─────────────────────────────────────────────────────── */

function EmbedEditor({ block, onChange }: EditorProps) {
  const p = block.props as { html: string };

  return (
    <div className="space-y-3">
      <label className={labelCls}>HTML / Embed Code
        <textarea value={p.html} onChange={(e) => onChange({ ...p, html: e.target.value })} rows={8} placeholder="<iframe>..." className={`${inputCls} font-mono text-xs`} />
      </label>
    </div>
  );
}

/* ── FAQ Editor ───────────────────────────────────────────────────────── */

function FaqEditor({ block, onChange }: EditorProps) {
  const p = block.props as { heading: string; items: Array<{ question: string; answer: string }> };
  const updateItem = (i: number, patch: Record<string, string>) => {
    const items = [...p.items];
    items[i] = { ...items[i], ...patch };
    onChange({ ...p, items });
  };

  return (
    <div className="space-y-3">
      <label className={labelCls}>Heading
        <input type="text" value={p.heading} onChange={(e) => onChange({ ...p, heading: e.target.value })} className={inputCls} />
      </label>
      <div className="space-y-2">
        {p.items.map((item, i) => (
          <div key={i} className="rounded border border-zinc-200 p-2 space-y-2">
            <div className="flex gap-2">
              <input type="text" value={item.question} onChange={(e) => updateItem(i, { question: e.target.value })} placeholder="Question" className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs" />
              <button onClick={() => onChange({ ...p, items: p.items.filter((_, j) => j !== i) })} className="text-red-500 hover:text-red-700 text-xs">✕</button>
            </div>
            <RichTextEditor value={item.answer} onChange={(v) => updateItem(i, { answer: v })} minHeight={60} placeholder="Answer" />
          </div>
        ))}
      </div>
      <button onClick={() => onChange({ ...p, items: [...p.items, { question: "", answer: "" }] })} className="w-full rounded border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50">+ Add FAQ</button>
    </div>
  );
}

/* ── Testimonial Editor ───────────────────────────────────────────────── */

function TestimonialEditor({ block, onChange }: EditorProps) {
  const p = block.props as {
    items: Array<{ quote: string; author: string; role: string; rating: number; avatar?: string }>;
    display: "grid" | "slider";
    columns: 1 | 2 | 3;
    itemsPerView: number;
    heading?: string;
  };
  const set = createSetter(block, onChange);

  const updateItem = (i: number, patch: Record<string, unknown>) => {
    const items = [...(p.items ?? [])];
    items[i] = { ...items[i], ...patch };
    set({ items });
  };

  const [uploadIdx, setUpIdx] = useState<number | null>(null);

  const uploadAvatar = async (i: number, file: File) => {
    setUpIdx(i);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
      updateItem(i, { avatar: json.url });
    } finally {
      setUpIdx(null);
    }
  };

  return (
    <div className="space-y-3">
      <label className={labelCls}>Section Heading
        <input type="text" value={p.heading ?? ""} onChange={(e) => set({ heading: e.target.value })} placeholder="What our customers say" className={inputCls} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>Display
          <select value={p.display} onChange={(e) => set({ display: e.target.value })} className={inputCls}>
            <option value="grid">Grid</option>
            <option value="slider">Slider</option>
          </select>
        </label>
        <label className={labelCls}>{p.display === "slider" ? "Slides Per View" : "Columns"}
          <select value={p.display === "slider" ? p.itemsPerView : p.columns} onChange={(e) => {
            const val = Number(e.target.value) as 1 | 2 | 3;
            if (p.display === "slider") set({ itemsPerView: val });
            else set({ columns: val });
          }} className={inputCls}>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </label>
      </div>
      <div className="space-y-2">
        {(p.items ?? []).map((item, i) => (
          <div key={i} className="rounded border border-zinc-200 p-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-zinc-500">TESTIMONIAL {i + 1}</span>
              {(p.items ?? []).length > 1 && (
                <button onClick={() => set({ items: p.items.filter((_: unknown, j: number) => j !== i) })} className="text-[10px] text-red-500 hover:text-red-700">Remove</button>
              )}
            </div>
            <RichTextEditor value={item.quote} onChange={(v) => updateItem(i, { quote: v })} minHeight={60} placeholder="Quote" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={item.author} onChange={(e) => updateItem(i, { author: e.target.value })} placeholder="Author" className="rounded border border-zinc-300 px-2 py-1 text-xs" />
              <input type="text" value={item.role} onChange={(e) => updateItem(i, { role: e.target.value })} placeholder="Role" className="rounded border border-zinc-300 px-2 py-1 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={item.rating} onChange={(e) => updateItem(i, { rating: Number(e.target.value) })} className="rounded border border-zinc-300 px-2 py-1 text-xs">
                <option value={0}>No stars</option>
                <option value={1}>★</option>
                <option value={2}>★★</option>
                <option value={3}>★★★</option>
                <option value={4}>★★★★</option>
                <option value={5}>★★★★★</option>
              </select>
              <div>
                {item.avatar && (
                  <div className="mb-1"><img src={item.avatar} alt="" className="h-7 w-7 rounded-full object-cover" /></div>
                )}
                <input type="file" accept="image/*" className="block w-full text-[10px] text-zinc-500 file:mr-1 file:rounded file:border-0 file:bg-zinc-200 file:px-1.5 file:py-0.5 file:text-[10px] file:font-medium" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAvatar(i, f); }} />
                {uploadIdx === i && <span className="text-[10px] text-zinc-400">Uploading…</span>}
                {item.avatar && <button onClick={() => updateItem(i, { avatar: "" })} className="text-[10px] text-red-500 hover:text-red-700">Remove</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => set({ items: [...(p.items ?? []), { quote: "", author: "", role: "", rating: 5, avatar: "" }] })} className="w-full rounded border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50">+ Add Testimonial</button>
    </div>
  );
}

/* ── Spacer Editor ────────────────────────────────────────────────────── */

function SpacerEditor({ block, onChange }: EditorProps) {
  const p = block.props as { height: number };

  return (
    <div className="space-y-3">
      <label className={labelCls}>Height (px)
        <input type="number" value={p.height} onChange={(e) => onChange({ ...p, height: Number(e.target.value) || 24 })} min={0} max={400} className={inputCls} />
      </label>
    </div>
  );
}

/* ── Divider Editor ───────────────────────────────────────────────────── */

function DividerEditor({ block, onChange }: EditorProps) {
  const p = block.props as Record<string, never>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">Divider has no configurable properties.</p>
    </div>
  );
}

/* ── Heading Editor ───────────────────────────────────────────────────── */

function HeadingEditor({ block, onChange }: EditorProps) {
  const p = block.props as Record<string, unknown>;
  const set = createSetter(block, onChange);
  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const [styleState, setStyleState] = useState<"normal" | "hover">("normal");
  const [advancedSection, setAdvancedSection] = useState<string | null>("layout");

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        {(["content", "style", "advanced"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-xs font-medium capitalize ${activeTab === tab ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Content Tab ─────────────────────────────────── */}
      {activeTab === "content" && (
        <div className="space-y-3">
          <div className="border-t border-zinc-200 pt-3">
            <span className="text-xs font-semibold text-zinc-700">Heading</span>
          </div>

          <div>
            <label className={labelCls}>Title</label>
            <textarea
              className={inputCls + " min-h-[80px]"}
              value={(p.text as string) || ""}
              onChange={(e) => set({ text: e.target.value })}
              placeholder="Enter heading text"
            />
          </div>

          <div>
            <label className={labelCls}>Link</label>
            <input
              type="url"
              className={inputCls}
              value={(p.link as string) || ""}
              onChange={(e) => set({ link: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          {p.link && (
            <label className={labelCls}>Link Target
              <select className={inputCls} value={(p.linkTarget as string) || ""} onChange={(e) => set({ linkTarget: e.target.value })}>
                <option value="">Same Window</option>
                <option value="_blank">New Window</option>
              </select>
            </label>
          )}

          <label className={labelCls}>HTML Tag
            <select className={inputCls} value={(p.level as number) || 2} onChange={(e) => set({ level: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>H{n}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* ── Style Tab ─────────────────────────────────── */}
      {activeTab === "style" && (
        <div className="space-y-3">
          <div className="border-t border-zinc-200 pt-3">
            <span className="text-xs font-semibold text-zinc-700">Heading</span>
          </div>

          {/* Alignment buttons */}
          <div>
            <span className={labelCls}>Alignment</span>
            <div className="mt-1 flex gap-1">
              {[
                { value: "left", icon: "⫷", label: "Left" },
                { value: "center", icon: "☰", label: "Center" },
                { value: "right", icon: "⫸", label: "Right" },
                { value: "justify", icon: "⫘", label: "Justify" },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => set({ align: opt.value })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${((p.align as string) ?? "left") === opt.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title={opt.label}>{opt.icon}</button>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="border-t border-zinc-200 pt-3">
            <span className="text-xs font-semibold text-zinc-700">Typography</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className={labelCls}>Font Family
              <select className={inputCls} value={(p.fontFamily as string) || ""} onChange={(e) => set({ fontFamily: e.target.value })}>
                <option value="">Default</option>
                <option value="inherit">Inherit</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Times New Roman, serif">Times</option>
                <option value="Courier New, monospace">Courier</option>
                <option value="Verdana, sans-serif">Verdana</option>
              </select>
            </label>
            <label className={labelCls}>Font Size
              <div className="flex gap-1">
                <input type="number" className={inputCls + " flex-1"} value={(p.fontSize as number) || ""} onChange={(e) => set({ fontSize: Number(e.target.value) || undefined })} min={0} max={200} placeholder="Auto" />
                <select className="w-14 rounded border border-zinc-300 px-1 py-1.5 text-xs" value={(p.fontSizeUnit as string) || "px"} onChange={(e) => set({ fontSizeUnit: e.target.value })}>
                  <option value="px">px</option>
                  <option value="em">em</option>
                  <option value="rem">rem</option>
                  <option value="%">%</option>
                  <option value="vw">vw</option>
                </select>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className={labelCls}>Weight
              <select className={inputCls} value={(p.fontWeight as string) || ""} onChange={(e) => set({ fontWeight: e.target.value })}>
                <option value="">Default</option>
                <option value="100">Thin (100)</option>
                <option value="300">Light (300)</option>
                <option value="400">Regular (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">Semibold (600)</option>
                <option value="700">Bold (700)</option>
                <option value="900">Black (900)</option>
              </select>
            </label>
            <label className={labelCls}>Transform
              <select className={inputCls} value={(p.textTransform as string) || "none"} onChange={(e) => set({ textTransform: e.target.value })}>
                <option value="none">None</option>
                <option value="uppercase">Uppercase</option>
                <option value="lowercase">Lowercase</option>
                <option value="capitalize">Capitalize</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className={labelCls}>Decoration
              <select className={inputCls} value={(p.textDecoration as string) || "none"} onChange={(e) => set({ textDecoration: e.target.value })}>
                <option value="none">None</option>
                <option value="underline">Underline</option>
                <option value="overline">Overline</option>
                <option value="line-through">Line Through</option>
              </select>
            </label>
            <label className={labelCls}>Line Height
              <input type="number" className={inputCls} value={(p.lineHeight as number) || ""} onChange={(e) => set({ lineHeight: Number(e.target.value) || undefined })} min={0} max={3} step={0.1} placeholder="Auto" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className={labelCls}>Letter Spacing
              <input type="number" className={inputCls} value={(p.letterSpacing as number) ?? ""} onChange={(e) => set({ letterSpacing: e.target.value ? Number(e.target.value) : undefined })} min={-10} max={20} step={0.5} placeholder="Auto" />
            </label>
            <label className={labelCls}>Word Spacing
              <input type="number" className={inputCls} value={(p.wordSpacing as number) ?? ""} onChange={(e) => set({ wordSpacing: e.target.value ? Number(e.target.value) : undefined })} min={-10} max={50} step={0.5} placeholder="Auto" />
            </label>
          </div>

          {/* Text Shadow */}
          <label className={labelCls}>Text Shadow
            <input type="text" className={inputCls} value={(p.textShadow as string) || ""} onChange={(e) => set({ textShadow: e.target.value })} placeholder="2px 2px 4px rgba(0,0,0,0.3)" />
          </label>

          {/* Blend Mode */}
          <label className={labelCls}>Blend Mode
            <select className={inputCls} value={(p.blendMode as string) || "normal"} onChange={(e) => set({ blendMode: e.target.value })}>
              <option value="normal">Normal</option>
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
              <option value="overlay">Overlay</option>
              <option value="darken">Darken</option>
              <option value="lighten">Lighten</option>
            </select>
          </label>

          {/* Text Color - Normal/Hover */}
          <div className="border-t border-zinc-200 pt-3">
            <span className={labelCls}>Text Color</span>
            <div className="mt-1 flex gap-2">
              <button type="button" onClick={() => setStyleState("normal")} className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${styleState === "normal" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600"}`}>Normal</button>
              <button type="button" onClick={() => setStyleState("hover")} className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${styleState === "hover" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600"}`}>Hover</button>
            </div>
          </div>

          {styleState === "normal" ? (
            <div>
              <label className={labelCls}>Text Color</label>
              <input type="color" className="mt-1 h-10 w-full rounded-lg border border-zinc-300" value={(p.textColor as string) || "#000000"} onChange={(e) => set({ textColor: e.target.value })} />
            </div>
          ) : (
            <div>
              <label className={labelCls}>Hover Color</label>
              <input type="color" className="mt-1 h-10 w-full rounded-lg border border-zinc-300" value={(p.hoverColor as string) || "#000000"} onChange={(e) => set({ hoverColor: e.target.value })} />
            </div>
          )}
        </div>
      )}

      {/* ── Advanced Tab ─────────────────────────────────── */}
      {activeTab === "advanced" && (
        <div className="space-y-3">
          {/* Layout section */}
          <button type="button" onClick={() => setAdvancedSection(advancedSection === "layout" ? null : "layout")} className="flex w-full items-center justify-between border-t border-zinc-200 pt-3 text-xs font-semibold text-zinc-700">
            Layout
            <span className="text-zinc-400">{advancedSection === "layout" ? "▾" : "▸"}</span>
          </button>

          {advancedSection === "layout" && (
            <div className="space-y-3">
              <label className={labelCls}>Width
                <select className={inputCls} value={(p.width as string) || "default"} onChange={(e) => set({ width: e.target.value })}>
                  <option value="default">Default</option>
                  <option value="full">Full Width</option>
                  <option value="boxed">Boxed</option>
                  <option value="inline">Inline</option>
                </select>
              </label>

              {/* Margin */}
              <div>
                <div className="flex items-center justify-between">
                  <span className={labelCls}>Margin</span>
                  <span className="text-[10px] text-zinc-400">px</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(["top", "right", "bottom", "left"] as const).map((side) => (
                    <input key={side} type="text" className="rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" placeholder={side.charAt(0).toUpperCase()} value={((p.margin as Record<string, string>)?.[side]) || ""} onChange={(e) => set({ margin: { ...(p.margin as Record<string, string>), [side]: e.target.value } })} />
                  ))}
                </div>
              </div>

              {/* Padding */}
              <div>
                <div className="flex items-center justify-between">
                  <span className={labelCls}>Padding</span>
                  <span className="text-[10px] text-zinc-400">px</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(["top", "right", "bottom", "left"] as const).map((side) => (
                    <input key={side} type="text" className="rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" placeholder={side.charAt(0).toUpperCase()} value={((p.padding as Record<string, string>)?.[side]) || ""} onChange={(e) => set({ padding: { ...(p.padding as Record<string, string>), [side]: e.target.value } })} />
                  ))}
                </div>
              </div>

              <label className={labelCls}>Z-Index
                <input type="number" className={inputCls} value={(p.zIndex as number) ?? ""} onChange={(e) => set({ zIndex: e.target.value ? Number(e.target.value) : undefined })} placeholder="Auto" />
              </label>

              <label className={labelCls}>CSS ID
                <input type="text" className={inputCls} value={(p.cssId as string) || ""} onChange={(e) => set({ cssId: e.target.value })} placeholder="my-heading" />
              </label>

              <label className={labelCls}>CSS Classes
                <input type="text" className={inputCls} value={(p.cssClasses as string) || ""} onChange={(e) => set({ cssClasses: e.target.value })} placeholder="custom-class" />
              </label>
            </div>
          )}

          {/* Motion Effects section */}
          <button type="button" onClick={() => setAdvancedSection(advancedSection === "motion" ? null : "motion")} className="flex w-full items-center justify-between border-t border-zinc-200 pt-3 text-xs font-semibold text-zinc-700">
            Motion Effects
            <span className="text-zinc-400">{advancedSection === "motion" ? "▾" : "▸"}</span>
          </button>

          {advancedSection === "motion" && (
            <div className="space-y-3">
              <label className={labelCls}>Entrance Animation
                <select className={inputCls} value={(p.entranceAnimation as string) || ""} onChange={(e) => set({ entranceAnimation: e.target.value })}>
                  <option value="">None</option>
                  <option value="fadeIn">Fade In</option>
                  <option value="fadeInUp">Fade In Up</option>
                  <option value="fadeInDown">Fade In Down</option>
                  <option value="fadeInLeft">Fade In Left</option>
                  <option value="fadeInRight">Fade In Right</option>
                  <option value="zoomIn">Zoom In</option>
                  <option value="bounceIn">Bounce In</option>
                </select>
              </label>
            </div>
          )}

          {/* Transform section */}
          <button type="button" onClick={() => setAdvancedSection(advancedSection === "transform" ? null : "transform")} className="flex w-full items-center justify-between border-t border-zinc-200 pt-3 text-xs font-semibold text-zinc-700">
            Transform
            <span className="text-zinc-400">{advancedSection === "transform" ? "▾" : "▸"}</span>
          </button>

          {advancedSection === "transform" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className={labelCls}>Rotate
                  <input type="number" className={inputCls} value={(p.rotateZ as number) ?? ""} onChange={(e) => set({ rotateZ: e.target.value ? Number(e.target.value) : undefined })} min={-360} max={360} placeholder="0" />
                </label>
                <label className={labelCls}>Scale
                  <input type="number" className={inputCls} value={(p.scaleX as number) ?? ""} onChange={(e) => set({ scaleX: Number(e.target.value) || undefined, scaleY: Number(e.target.value) || undefined })} min={0} max={5} step={0.1} placeholder="1" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelCls}>Offset X
                  <input type="number" className={inputCls} value={(p.offsetX as number) ?? ""} onChange={(e) => set({ offsetX: Number(e.target.value) || undefined })} placeholder="0" />
                </label>
                <label className={labelCls}>Offset Y
                  <input type="number" className={inputCls} value={(p.offsetY as number) ?? ""} onChange={(e) => set({ offsetY: Number(e.target.value) || undefined })} placeholder="0" />
                </label>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => set({ flipH: !(p.flipH as boolean) })} className={`flex-1 rounded border px-3 py-1.5 text-xs font-medium ${(p.flipH as boolean) ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600"}`}>Flip H</button>
                <button type="button" onClick={() => set({ flipV: !(p.flipV as boolean) })} className={`flex-1 rounded border px-3 py-1.5 text-xs font-medium ${(p.flipV as boolean) ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600"}`}>Flip V</button>
              </div>
            </div>
          )}

          {/* Background section */}
          <button type="button" onClick={() => setAdvancedSection(advancedSection === "background" ? null : "background")} className="flex w-full items-center justify-between border-t border-zinc-200 pt-3 text-xs font-semibold text-zinc-700">
            Background
            <span className="text-zinc-400">{advancedSection === "background" ? "▾" : "▸"}</span>
          </button>

          {advancedSection === "background" && (
            <div className="space-y-3">
              <label className={labelCls}>Background Color
                <input type="color" className="mt-1 h-10 w-full rounded-lg border border-zinc-300" value={(p.bgColor as string) || "#ffffff"} onChange={(e) => set({ bgColor: e.target.value })} />
              </label>
            </div>
          )}

          {/* Border section */}
          <button type="button" onClick={() => setAdvancedSection(advancedSection === "border" ? null : "border")} className="flex w-full items-center justify-between border-t border-zinc-200 pt-3 text-xs font-semibold text-zinc-700">
            Border
            <span className="text-zinc-400">{advancedSection === "border" ? "▾" : "▸"}</span>
          </button>

          {advancedSection === "border" && (
            <div className="space-y-3">
              <label className={labelCls}>Border Type
                <select className={inputCls} value={(p.borderStyle as string) || "none"} onChange={(e) => set({ borderStyle: e.target.value })}>
                  <option value="none">Default</option>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                  <option value="double">Double</option>
                </select>
              </label>

              {(p.borderStyle ?? "none") !== "none" && (
                <>
                  <label className={labelCls}>Border Width
                    <input type="number" className={inputCls} value={(p.borderWidth as number) || 1} onChange={(e) => set({ borderWidth: Number(e.target.value) })} min={0} max={20} />
                  </label>
                  <label className={labelCls}>Border Color
                    <input type="color" className="mt-1 h-10 w-full rounded-lg border border-zinc-300" value={(p.borderColor as string) || "#000000"} onChange={(e) => set({ borderColor: e.target.value })} />
                  </label>
                </>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <span className={labelCls}>Border Radius</span>
                  <span className="text-[10px] text-zinc-400">px</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  <input type="number" className="rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" placeholder="T" value={(p.borderRadiusTop as number) || ""} onChange={(e) => set({ borderRadiusTop: Number(e.target.value) || undefined })} />
                  <input type="number" className="rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" placeholder="R" value={(p.borderRadiusRight as number) || ""} onChange={(e) => set({ borderRadiusRight: Number(e.target.value) || undefined })} />
                  <input type="number" className="rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" placeholder="B" value={(p.borderRadiusBottom as number) || ""} onChange={(e) => set({ borderRadiusBottom: Number(e.target.value) || undefined })} />
                  <input type="number" className="rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" placeholder="L" value={(p.borderRadiusLeft as number) || ""} onChange={(e) => set({ borderRadiusLeft: Number(e.target.value) || undefined })} />
                </div>
              </div>

              <label className={labelCls}>Box Shadow
                <input type="text" className={inputCls} value={(p.boxShadow as string) || ""} onChange={(e) => set({ boxShadow: e.target.value })} placeholder="0 2px 4px rgba(0,0,0,0.1)" />
              </label>
            </div>
          )}

          {/* Responsive section */}
          <button type="button" onClick={() => setAdvancedSection(advancedSection === "responsive" ? null : "responsive")} className="flex w-full items-center justify-between border-t border-zinc-200 pt-3 text-xs font-semibold text-zinc-700">
            Responsive
            <span className="text-zinc-400">{advancedSection === "responsive" ? "▾" : "▸"}</span>
          </button>

          {advancedSection === "responsive" && (
            <div className="space-y-3">
              {[
                { key: "hideOnDesktop", label: "Hide On Desktop" },
                { key: "hideOnTablet", label: "Hide On Tablet" },
                { key: "hideOnMobile", label: "Hide On Mobile" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={labelCls}>{label}</span>
                  <button type="button" onClick={() => set({ [key]: !(p[key] as boolean) })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p[key] ? "bg-zinc-900" : "bg-zinc-300"}`}>
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${p[key] ? "translate-x-4.5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Custom CSS section */}
          <button type="button" onClick={() => setAdvancedSection(advancedSection === "css" ? null : "css")} className="flex w-full items-center justify-between border-t border-zinc-200 pt-3 text-xs font-semibold text-zinc-700">
            Custom CSS
            <span className="text-zinc-400">{advancedSection === "css" ? "▾" : "▸"}</span>
          </button>

          {advancedSection === "css" && (
            <div className="space-y-3">
              <label className={labelCls}>Add your own custom CSS
                <textarea
                  className={inputCls + " min-h-[120px] font-mono text-xs"}
                  value={(p.customCss as string) || ""}
                  onChange={(e) => set({ customCss: e.target.value })}
                  placeholder={`selector {\n  color: red;\n}`}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── List Editor ──────────────────────────────────────────────────────── */

function ListEditor({ block, onChange }: EditorProps) {
  const p = block.props as { ordered: boolean; items: string[] };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs text-zinc-600">
        <input type="checkbox" checked={p.ordered} onChange={(e) => onChange({ ...p, ordered: e.target.checked })} className="accent-amber-600" />
        Ordered List
      </label>
      <label className={labelCls}>Items (one per line)
        <textarea value={p.items.join("\n")} onChange={(e) => onChange({ ...p, items: e.target.value.split("\n") })} rows={6} className={inputCls} />
      </label>
    </div>
  );
}

/* ── Slider Editor ────────────────────────────────────────────────────── */

function SliderEditor({ block, onChange }: EditorProps) {
  const p = block.props as {
    slides: Array<{ src: string; alt: string; title: string; caption: string; url: string; buttonText: string; buttonUrl: string }>;
    height: "sm" | "md" | "lg";
    itemsPerView: number;
    imageFit: "cover" | "fluid";
    captionLayout: "bottom" | "center";
  };
  const updateSlide = (i: number, patch: Record<string, string>) => {
    const slides = [...p.slides];
    slides[i] = { ...slides[i], ...patch };
    onChange({ ...p, slides });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>Height
          <select value={p.height} onChange={(e) => onChange({ ...p, height: e.target.value as "sm" | "md" | "lg" })} className={inputCls}>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </label>
        <label className={labelCls}>Image Fit
          <select value={p.imageFit} onChange={(e) => onChange({ ...p, imageFit: e.target.value as "cover" | "fluid" })} className={inputCls}>
            <option value="cover">Cover</option>
            <option value="fluid">Fluid</option>
          </select>
        </label>
      </div>
      <label className={labelCls}>Items Per View
        <input type="number" value={p.itemsPerView} onChange={(e) => onChange({ ...p, itemsPerView: Number(e.target.value) || 1 })} min={1} max={5} className={inputCls} />
      </label>
      <div className="space-y-2">
        {p.slides.map((slide, i) => (
          <div key={i} className="rounded border border-zinc-200 p-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-zinc-500">Slide {i + 1}</span>
              <button onClick={() => onChange({ ...p, slides: p.slides.filter((_, j) => j !== i) })} className="text-red-500 hover:text-red-700 text-xs">✕</button>
            </div>
            <BuilderImageUploader label="" value={slide.src} onChange={(url) => updateSlide(i, { src: url })} />
            <input type="text" value={slide.title} onChange={(e) => updateSlide(i, { title: e.target.value })} placeholder="Title" className="w-full rounded border border-zinc-300 px-2 py-1 text-xs" />
            <input type="text" value={slide.caption} onChange={(e) => updateSlide(i, { caption: e.target.value })} placeholder="Caption" className="w-full rounded border border-zinc-300 px-2 py-1 text-xs" />
          </div>
        ))}
      </div>
      <button onClick={() => onChange({ ...p, slides: [...p.slides, { src: "", alt: "", title: "", caption: "", url: "", buttonText: "", buttonUrl: "" }] })} className="w-full rounded border border-dashed border-zinc-300 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50">+ Add Slide</button>
    </div>
  );
}

/* ── Content Grid Editor ──────────────────────────────────────────────── */

function ContentGridEditor({ block, onChange }: EditorProps) {
  const p = block.props as { heading: string; source: "articles" | "feeds"; categoryId: string; perPage: number; columns: 2 | 3 | 4; showExcerpt: boolean; order: "desc" | "asc" };
  const set = createSetter(block, onChange);

  return (
    <div className="space-y-3">
      <label className={labelCls}>Heading
        <input type="text" value={p.heading} onChange={(e) => set({ heading: e.target.value })} className={inputCls} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>Source
          <select value={p.source} onChange={(e) => set({ source: e.target.value })} className={inputCls}>
            <option value="articles">Articles</option>
            <option value="feeds">Feeds</option>
          </select>
        </label>
        <label className={labelCls}>Category ID
          <input type="text" value={p.categoryId} onChange={(e) => set({ categoryId: e.target.value })} placeholder="All" className={inputCls} />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className={labelCls}>Per Page
          <input type="number" value={p.perPage} onChange={(e) => set({ perPage: Number(e.target.value) || 6 })} min={1} max={24} className={inputCls} />
        </label>
        <label className={labelCls}>Columns
          <select value={p.columns} onChange={(e) => set({ columns: Number(e.target.value) })} className={inputCls}>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </label>
        <label className={labelCls}>Order
          <select value={p.order} onChange={(e) => set({ order: e.target.value })} className={inputCls}>
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs text-zinc-600">
        <input type="checkbox" checked={p.showExcerpt} onChange={(e) => set({ showExcerpt: e.target.checked })} className="accent-amber-600" />
        Show Excerpt
      </label>
    </div>
  );
}

/* ── Row Editor (delegates to full RowEditor) ──────────────────────────── */

function InlineRowEditor({ block, onChange, onRemove, onDuplicate, themeColors }: EditorProps) {
  const p = block.props as import("@/lib/page-builder/types").RowBlock["props"];
  return (
    <RowEditor
      block={{ id: block.id, type: "row", props: p } as import("@/lib/page-builder/types").RowBlock}
      onChange={(newProps) => onChange(newProps)}
      onRemove={onRemove}
      onDuplicate={onDuplicate}
      onAddColumn={() => {
        const newCol: ColumnData = { id: crypto.randomUUID(), span: 6, blocks: [] };
        onChange({ ...p, columns: [...p.columns, newCol] });
      }}
      themeColors={themeColors}
    />
  );
}

/* ── Section Editor (delegates to full SectionEditor) ──────────────────── */

function InlineSectionEditor({ block, onChange, onRemove, onDuplicate, themeColors }: EditorProps) {
  const p = block.props as import("@/lib/page-builder/types").SectionBlock["props"];
  return (
    <SectionEditor
      block={{ id: block.id, type: "section", props: p } as import("@/lib/page-builder/types").SectionBlock}
      onChange={(newProps) => onChange(newProps)}
      onRemove={onRemove}
      onDuplicate={onDuplicate}
      onAddRow={() => {
        const newRow: import("@/lib/page-builder/types").RowBlock = {
          id: crypto.randomUUID(),
          type: "row",
          props: { columns: [{ id: crypto.randomUUID(), span: 12, blocks: [] }], gap: 24, align: "stretch", stackOnMobile: true, paddingY: 16, fullWidth: false },
        };
        onChange({ ...p, rows: [...(p.rows ?? []), newRow] });
      }}
      themeColors={themeColors}
    />
  );
}

/* ── Generic Fallback Editor ───────────────────────────────────────────── */

function GenericEditor({ block, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">Edit the <strong>{block.type}</strong> block properties below.</p>
      <pre className="max-h-48 overflow-auto rounded bg-zinc-100 p-2 text-[10px] text-zinc-600">{JSON.stringify(block.props, null, 2)}</pre>
    </div>
  );
}

/* ── Editor Router ─────────────────────────────────────────────────────── */

const EDITORS: Record<string, React.ComponentType<EditorProps>> = {
  logo: LogoEditor,
  menu: MenuEditor,
  socialIcons: SocialIconsEditor,
  contactInfo: ContactInfoEditor,
  search: SearchEditor,
  hero: HeroEditor,
  text: TextEditor,
  image: ImageEditor,
  cta: CtaEditor,
  features: FeaturesEditor,
  button: ButtonEditor,
  embed: EmbedEditor,
  faq: FaqEditor,
  testimonial: TestimonialEditor,
  spacer: SpacerEditor,
  divider: DividerEditor,
  heading: HeadingEditor,
  list: ListEditor,
  slider: SliderEditor,
  contentGrid: ContentGridEditor,
  row: InlineRowEditor,
  section: InlineSectionEditor,
};

export default function HeaderFooterEditor({
  block,
  onChange,
  onRemove,
  onDuplicate,
  onUpdateColumn,
  themeColors,
}: EditorProps) {
  const Editor = EDITORS[block.type] ?? GenericEditor;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">{getBlockIcon(block.type)}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">{getBlockLabel(block.type)}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={onDuplicate} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100" title="Duplicate">⧉</button>
          <button onClick={onRemove} className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50" title="Remove">✕</button>
        </div>
      </div>
      <div className="p-4">
        <Editor block={block} onChange={onChange} onRemove={onRemove} onDuplicate={onDuplicate} onUpdateColumn={onUpdateColumn} themeColors={themeColors} />
      </div>
    </div>
  );
}

function getBlockIcon(type: string): string {
  const icons: Record<string, string> = {
    logo: "◎", menu: "☰", socialIcons: "⏹", contactInfo: "📞", search: "🔍",
    hero: "⬛", text: "📝", image: "🖼", cta: "🔘", features: "📊",
    button: "🔗", embed: "</>", faq: "❓", testimonial: "💬", spacer: "↕",
    divider: "—", heading: "H", list: "≡", slider: "◫", contentGrid: "▦",
    row: "▦", section: "▣",
  };
  return icons[type] ?? "□";
}

function getBlockLabel(type: string): string {
  const labels: Record<string, string> = {
    logo: "Logo", menu: "Menu", socialIcons: "Social Icons", contactInfo: "Contact Info", search: "Search",
    hero: "Hero", text: "Text", image: "Image", cta: "CTA", features: "Features",
    button: "Button", embed: "Embed", faq: "FAQ", testimonial: "Testimonial", spacer: "Spacer",
    divider: "Divider", heading: "Heading", list: "List", slider: "Slider", contentGrid: "Content Grid",
    row: "Row", section: "Section",
  };
  return labels[type] ?? type;
}
