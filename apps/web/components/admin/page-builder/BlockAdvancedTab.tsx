"use client";

import { useState } from "react";
import { inputCls, labelCls } from "./settings";
import { SpacingInput, type SpacingValues } from "./settings";

/* ── Types ───────────────────────────────────────────────────────────────── */

export interface AdvancedTabProps {
  props: Record<string, unknown>;
  set: (patch: Record<string, unknown>) => void;
  show?: AdvancedSection[];
  themeColors?: string[];
}

export type AdvancedSection =
  | "layout"
  | "motionEffects"
  | "transform"
  | "background"
  | "border"
  | "mask"
  | "responsive"
  | "attributes"
  | "customCss";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function SectionHeader({ label, isOpen, onToggle }: { label: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center justify-between border-t border-zinc-200 pt-3 text-xs font-semibold text-zinc-700">
      {label}
      <span className="text-zinc-400">{isOpen ? "▾" : "▸"}</span>
    </button>
  );
}

const ENTRANCE_ANIMATIONS = [
  "", "fadeIn", "fadeInUp", "fadeInDown", "fadeInLeft", "fadeInRight",
  "zoomIn", "zoomInUp", "bounceIn", "slideInUp", "slideInDown",
];

/* ── Component ───────────────────────────────────────────────────────────── */

export default function BlockAdvancedTab({ props: p, set, show }: AdvancedTabProps) {
  const allSections = show ?? (["layout", "motionEffects", "transform", "background", "border", "mask", "responsive", "attributes", "customCss"] as AdvancedSection[]);
  const [openSection, setOpenSection] = useState<string | null>("layout");

  const toggle = (key: string) => setOpenSection(openSection === key ? null : key);

  const margin: SpacingValues = (p.margin as SpacingValues) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const padding: SpacingValues = (p.padding as SpacingValues) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const [linkedMargin, setLinkedMargin] = useState(false);
  const [linkedPadding, setLinkedPadding] = useState(false);

  return (
    <div className="space-y-1">
      {/* ═══ LAYOUT ═══ */}
      {allSections.includes("layout") && (
        <>
          <SectionHeader label="Layout" isOpen={openSection === "layout"} onToggle={() => toggle("layout")} />
          {openSection === "layout" && (
            <div className="space-y-3 pb-3">
              <SpacingInput label="Margin" value={margin} onChange={(v) => set({ margin: v })} linked={linkedMargin} onToggleLinked={() => setLinkedMargin(!linkedMargin)} />
              <SpacingInput label="Padding" value={padding} onChange={(v) => set({ padding: v })} linked={linkedPadding} onToggleLinked={() => setLinkedPadding(!linkedPadding)} />

              <label className={labelCls}>Width
                <select className={inputCls} value={(p.width as string) || "default"} onChange={(e) => set({ width: e.target.value })}>
                  <option value="default">Default</option>
                  <option value="full">Full Width</option>
                  <option value="boxed">Boxed</option>
                  <option value="inline">Inline</option>
                </select>
              </label>

              <label className={labelCls}>Position
                <select className={inputCls} value={(p.position as string) || "default"} onChange={(e) => set({ position: e.target.value })}>
                  <option value="default">Default</option>
                  <option value="absolute">Absolute</option>
                  <option value="fixed">Fixed</option>
                  <option value="relative">Relative</option>
                  <option value="sticky">Sticky</option>
                </select>
              </label>

              <label className={labelCls}>Z-Index
                <input type="number" className={inputCls} value={(p.zIndex as number) ?? ""} onChange={(e) => set({ zIndex: e.target.value ? Number(e.target.value) : undefined })} placeholder="Auto" />
              </label>

              <label className={labelCls}>CSS ID
                <input type="text" className={inputCls} value={(p.cssId as string) || ""} onChange={(e) => set({ cssId: e.target.value })} placeholder="my-id" />
              </label>

              <label className={labelCls}>CSS Classes
                <input type="text" className={inputCls} value={(p.cssClasses as string) || ""} onChange={(e) => set({ cssClasses: e.target.value })} placeholder="class1 class2" />
              </label>
            </div>
          )}
        </>
      )}

      {/* ═══ MOTION EFFECTS ═══ */}
      {allSections.includes("motionEffects") && (
        <>
          <SectionHeader label="Motion Effects" isOpen={openSection === "motionEffects"} onToggle={() => toggle("motionEffects")} />
          {openSection === "motionEffects" && (
            <div className="space-y-3 pb-3">
              <label className={labelCls}>Entrance Animation
                <select className={inputCls} value={(p.entranceAnimation as string) || ""} onChange={(e) => set({ entranceAnimation: e.target.value || undefined })}>
                  <option value="">Default</option>
                  {ENTRANCE_ANIMATIONS.filter(Boolean).map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </label>

              <label className={labelCls}>Sticky
                <select className={inputCls} value={(p.sticky as string) || "none"} onChange={(e) => set({ sticky: e.target.value })}>
                  <option value="none">None</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>
            </div>
          )}
        </>
      )}

      {/* ═══ TRANSFORM ═══ */}
      {allSections.includes("transform") && (
        <>
          <SectionHeader label="Transform" isOpen={openSection === "transform"} onToggle={() => toggle("transform")} />
          {openSection === "transform" && (
            <div className="space-y-3 pb-3">
              <label className={labelCls}>Rotate
                <div className="flex items-stretch gap-1">
                  <input type="number" className={`${inputCls} mt-0 min-w-0 flex-1`} value={(p.rotateZ as number) || ""} onChange={(e) => set({ rotateZ: Number(e.target.value) || undefined })} min={-360} max={360} placeholder="0" />
                  <span className="flex items-center text-xs text-zinc-400">deg</span>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className={labelCls}>Scale X
                  <input type="number" className={inputCls} value={(p.scaleX as number) || ""} onChange={(e) => set({ scaleX: Number(e.target.value) || undefined })} min={0} max={5} step={0.1} placeholder="1" />
                </label>
                <label className={labelCls}>Scale Y
                  <input type="number" className={inputCls} value={(p.scaleY as number) || ""} onChange={(e) => set({ scaleY: Number(e.target.value) || undefined })} min={0} max={5} step={0.1} placeholder="1" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className={labelCls}>Offset X
                  <input type="number" className={inputCls} value={(p.offsetX as number) || ""} onChange={(e) => set({ offsetX: Number(e.target.value) || undefined })} placeholder="0" />
                </label>
                <label className={labelCls}>Offset Y
                  <input type="number" className={inputCls} value={(p.offsetY as number) || ""} onChange={(e) => set({ offsetY: Number(e.target.value) || undefined })} placeholder="0" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className={labelCls}>Skew X
                  <input type="number" className={inputCls} value={(p.skewX as number) || ""} onChange={(e) => set({ skewX: Number(e.target.value) || undefined })} min={-45} max={45} placeholder="0" />
                </label>
                <label className={labelCls}>Skew Y
                  <input type="number" className={inputCls} value={(p.skewY as number) || ""} onChange={(e) => set({ skewY: Number(e.target.value) || undefined })} min={-45} max={45} placeholder="0" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className={labelCls}>Flip Horizontal</span>
                  <div className="mt-1 flex gap-1">
                    <button type="button" onClick={() => set({ flipH: false })} className={`flex h-8 flex-1 items-center justify-center rounded border text-sm ${(p.flipH as boolean) !== true ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`}>Off</button>
                    <button type="button" onClick={() => set({ flipH: true })} className={`flex h-8 flex-1 items-center justify-center rounded border text-sm ${(p.flipH as boolean) === true ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`}>On</button>
                  </div>
                </div>
                <div>
                  <span className={labelCls}>Flip Vertical</span>
                  <div className="mt-1 flex gap-1">
                    <button type="button" onClick={() => set({ flipV: false })} className={`flex h-8 flex-1 items-center justify-center rounded border text-sm ${(p.flipV as boolean) !== true ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`}>Off</button>
                    <button type="button" onClick={() => set({ flipV: true })} className={`flex h-8 flex-1 items-center justify-center rounded border text-sm ${(p.flipV as boolean) === true ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`}>On</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ BACKGROUND ═══ */}
      {allSections.includes("background") && (
        <>
          <SectionHeader label="Background" isOpen={openSection === "background"} onToggle={() => toggle("background")} />
          {openSection === "background" && (
            <div className="space-y-3 pb-3">
              <label className={labelCls}>Background Color
                <div className="flex items-center gap-2">
                  <input type="color" className="h-10 w-12 rounded-lg border border-zinc-300" value={(p.bgColor as string) || "#ffffff"} onChange={(e) => set({ bgColor: e.target.value })} />
                  <input className={inputCls} value={(p.bgColor as string) || ""} onChange={(e) => set({ bgColor: e.target.value })} placeholder="#ffffff" />
                </div>
              </label>

              <label className={labelCls}>Background Image
                <input type="text" className={inputCls} value={(p.bgImage as string) || ""} onChange={(e) => set({ bgImage: e.target.value })} placeholder="URL" />
              </label>

              {Boolean(p.bgImage) && (
                <>
                  <label className={labelCls}>Position
                    <select className={inputCls} value={(p.bgPosition as string) || "center center"} onChange={(e) => set({ bgPosition: e.target.value })}>
                      {["center center", "top left", "top center", "top right", "center left", "center right", "bottom left", "bottom center", "bottom right"].map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </label>
                  <label className={labelCls}>Size
                    <select className={inputCls} value={(p.bgSize as string) || "cover"} onChange={(e) => set({ bgSize: e.target.value })}>
                      <option value="auto">Auto</option>
                      <option value="cover">Cover</option>
                      <option value="contain">Contain</option>
                    </select>
                  </label>
                  <label className={labelCls}>Repeat
                    <select className={inputCls} value={(p.bgRepeat as string) || "no-repeat"} onChange={(e) => set({ bgRepeat: e.target.value })}>
                      <option value="repeat">Repeat</option>
                      <option value="no-repeat">No Repeat</option>
                      <option value="repeat-x">Repeat X</option>
                      <option value="repeat-y">Repeat Y</option>
                    </select>
                  </label>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ BORDER ═══ */}
      {allSections.includes("border") && (
        <>
          <SectionHeader label="Border" isOpen={openSection === "border"} onToggle={() => toggle("border")} />
          {openSection === "border" && (
            <div className="space-y-3 pb-3">
              <label className={labelCls}>Border Type
                <select className={inputCls} value={(p.borderStyle as string) || "none"} onChange={(e) => set({ borderStyle: e.target.value })}>
                  <option value="none">Default</option>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                  <option value="double">Double</option>
                </select>
              </label>

              {Boolean(p.borderStyle) && p.borderStyle !== "none" && (
                <div className="grid grid-cols-2 gap-2">
                  <label className={labelCls}>Width
                    <input type="number" className={inputCls} value={(p.borderWidth as number) || 1} onChange={(e) => set({ borderWidth: Number(e.target.value) || 1 })} min={0} max={20} />
                  </label>
                  <label className={labelCls}>Color
                    <input type="color" className="mt-1 h-10 w-full rounded-lg border border-zinc-300" value={(p.borderColor as string) || "#000000"} onChange={(e) => set({ borderColor: e.target.value })} />
                  </label>
                </div>
              )}

              <div>
                <span className={labelCls}>Border Radius</span>
                <div className="mt-1 grid grid-cols-4 gap-1">
                  {(["borderRadiusTop", "borderRadiusRight", "borderRadiusBottom", "borderRadiusLeft"] as const).map((key, i) => (
                    <input key={key} type="number" value={(p[key] as number) || ""} onChange={(e) => set({ [key]: Number(e.target.value) || undefined })} className="w-full rounded border border-zinc-300 px-2 py-1.5 text-center text-xs" placeholder={["T", "R", "B", "L"][i]} min={0} />
                  ))}
                </div>
                <div className="mt-0.5 flex justify-between px-1">
                  {["T", "R", "B", "L"].map((l) => (
                    <span key={l} className="text-[9px] text-zinc-400">{l}</span>
                  ))}
                </div>
              </div>

              <label className={labelCls}>Box Shadow
                <input type="text" className={inputCls} value={(p.boxShadow as string) || ""} onChange={(e) => set({ boxShadow: e.target.value })} placeholder="0 4px 12px rgba(0,0,0,0.15)" />
              </label>
            </div>
          )}
        </>
      )}

      {/* ═══ MASK ═══ */}
      {allSections.includes("mask") && (
        <>
          <SectionHeader label="Mask" isOpen={openSection === "mask"} onToggle={() => toggle("mask")} />
          {openSection === "mask" && (
            <div className="space-y-3 pb-3">
              <div className="flex items-center justify-between">
                <span className={labelCls}>Mask</span>
                <button type="button" onClick={() => set({ mask: !(p.mask as boolean) })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(p.mask as boolean) ? "bg-zinc-900" : "bg-zinc-300"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(p.mask as boolean) ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ RESPONSIVE ═══ */}
      {allSections.includes("responsive") && (
        <>
          <SectionHeader label="Responsive" isOpen={openSection === "responsive"} onToggle={() => toggle("responsive")} />
          {openSection === "responsive" && (
            <div className="space-y-3 pb-3">
              <p className="text-[11px] leading-snug text-zinc-400">
                Responsive visibility will take effect only on preview mode or live page.
              </p>
              {(["hideOnDesktop", "hideOnTablet", "hideOnMobile"] as const).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={labelCls}>{key === "hideOnDesktop" ? "Hide On Desktop" : key === "hideOnTablet" ? "Hide On Tablet Portrait" : "Hide On Mobile Portrait"}</span>
                  <button type="button" onClick={() => set({ [key]: !(p[key] as boolean) })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(p[key] as boolean) ? "bg-zinc-900" : "bg-zinc-300"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(p[key] as boolean) ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ ATTRIBUTES ═══ */}
      {allSections.includes("attributes") && (
        <>
          <SectionHeader label="Attributes" isOpen={openSection === "attributes"} onToggle={() => toggle("attributes")} />
          {openSection === "attributes" && (
            <div className="space-y-3 pb-3">
              <label className={labelCls}>Custom Attributes
                <textarea className={`${inputCls} font-mono text-xs`} rows={3} value={(p.customAttributes as string) || ""} onChange={(e) => set({ customAttributes: e.target.value })} placeholder={"key|value\nkey2|value2"} />
              </label>
              <p className="text-[11px] leading-snug text-zinc-400">
                Set custom attributes for the wrapper element. Each attribute in a separate line. Separate attribute key from the value using | character.
              </p>
            </div>
          )}
        </>
      )}

      {/* ═══ CUSTOM CSS ═══ */}
      {allSections.includes("customCss") && (
        <>
          <SectionHeader label="Custom CSS" isOpen={openSection === "customCss"} onToggle={() => toggle("customCss")} />
          {openSection === "customCss" && (
            <div className="space-y-3 pb-3">
              <label className={labelCls}>Add your own custom CSS
                <textarea className={`${inputCls} min-h-[120px] font-mono text-xs`} rows={6} value={(p.customCss as string) || ""} onChange={(e) => set({ customCss: e.target.value })} placeholder={".selector { color: red; }"} />
              </label>
              <p className="text-[11px] leading-snug text-zinc-400">
                Use <span className="font-semibold">custom CSS</span> to style your content or add the &quot;selector&quot; prefix to target specific elements.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
