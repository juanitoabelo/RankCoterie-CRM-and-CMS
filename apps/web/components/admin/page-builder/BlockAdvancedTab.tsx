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
  | "customCss"
  | "displayConditions"
  | "cacheSettings";

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

/* ── Reusable Toggle Tab ─────────────────────────────────────────────────── */

function ToggleTab({ active, onChange }: { active: "normal" | "hover"; onChange: (v: "normal" | "hover") => void }) {
  return (
    <div className="mb-2 flex rounded-lg border border-zinc-200 p-0.5">
      <button type="button" onClick={() => onChange("normal")} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${active === "normal" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>Normal</button>
      <button type="button" onClick={() => onChange("hover")} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${active === "hover" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>Hover</button>
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────────────────── */

export default function BlockAdvancedTab({ props: p, set, show }: AdvancedTabProps) {
  const allSections = show ?? (["layout", "motionEffects", "transform", "background", "border", "mask", "responsive", "attributes", "customCss", "displayConditions", "cacheSettings"] as AdvancedSection[]);
  const [openSection, setOpenSection] = useState<string | null>("layout");

  const toggle = (key: string) => setOpenSection(openSection === key ? null : key);

  const margin: SpacingValues = (p.margin as SpacingValues) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const padding: SpacingValues = (p.padding as SpacingValues) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const [linkedMargin, setLinkedMargin] = useState(false);
  const [linkedPadding, setLinkedPadding] = useState(false);

  const [transformState, setTransformState] = useState<"normal" | "hover">("normal");
  const [bgState, setBgState] = useState<"normal" | "hover">("normal");
  const [borderState, setBorderState] = useState<"normal" | "hover">("normal");

  /** Helper to pick normal vs hover prop prefix */
  const tp = (base: string) => transformState === "hover" ? `hover${base.charAt(0).toUpperCase()}${base.slice(1)}` : base;
  const bp = (base: string) => borderState === "hover" ? `hover${base.charAt(0).toUpperCase()}${base.slice(1)}` : base;
  const gp = (base: string) => bgState === "hover" ? `hover${base.charAt(0).toUpperCase()}${base.slice(1)}` : base;

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

              <div className="border-t border-zinc-200 pt-3">
                <span className="text-xs font-semibold text-zinc-700">Grid Item</span>
              </div>

              <label className={labelCls}>Column Span
                <select className={inputCls} value={(p.gridColumnSpan as string) || "default"} onChange={(e) => set({ gridColumnSpan: e.target.value })}>
                  <option value="default">Default</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <option key={n} value={String(n)}>{n}</option>
                  ))}
                </select>
              </label>

              <label className={labelCls}>Row Span
                <select className={inputCls} value={(p.gridRowSpan as string) || "default"} onChange={(e) => set({ gridRowSpan: e.target.value })}>
                  <option value="default">Default</option>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={String(n)}>{n}</option>
                  ))}
                </select>
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
              <div className="flex items-center justify-between">
                <span className={labelCls}>Scrolling Effects</span>
                <button type="button" onClick={() => set({ scrollingEffects: !(p.scrollingEffects as boolean) })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(p.scrollingEffects as boolean) ? "bg-zinc-900" : "bg-zinc-300"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(p.scrollingEffects as boolean) ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className={labelCls}>Mouse Effects</span>
                <button type="button" onClick={() => set({ mouseEffects: !(p.mouseEffects as boolean) })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(p.mouseEffects as boolean) ? "bg-zinc-900" : "bg-zinc-300"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(p.mouseEffects as boolean) ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              <label className={labelCls}>Sticky
                <select className={inputCls} value={(p.sticky as string) || "none"} onChange={(e) => set({ sticky: e.target.value })}>
                  <option value="none">None</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>

              <label className={labelCls}>Entrance Animation
                <select className={inputCls} value={(p.entranceAnimation as string) || ""} onChange={(e) => set({ entranceAnimation: e.target.value || undefined })}>
                  <option value="">Default</option>
                  {ENTRANCE_ANIMATIONS.filter(Boolean).map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
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
              <ToggleTab active={transformState} onChange={setTransformState} />

              <label className={labelCls}>Rotate
                <div className="flex items-stretch gap-1">
                  <input type="number" className={`${inputCls} mt-0 min-w-0 flex-1`} value={(p[tp("rotateZ")] as number) || ""} onChange={(e) => set({ [tp("rotateZ")]: Number(e.target.value) || undefined })} min={-360} max={360} placeholder="0" />
                  <span className="flex items-center text-xs text-zinc-400">deg</span>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className={labelCls}>Scale X
                  <input type="number" className={inputCls} value={(p[tp("scaleX")] as number) || ""} onChange={(e) => set({ [tp("scaleX")]: Number(e.target.value) || undefined })} min={0} max={5} step={0.1} placeholder="1" />
                </label>
                <label className={labelCls}>Scale Y
                  <input type="number" className={inputCls} value={(p[tp("scaleY")] as number) || ""} onChange={(e) => set({ [tp("scaleY")]: Number(e.target.value) || undefined })} min={0} max={5} step={0.1} placeholder="1" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className={labelCls}>Offset X
                  <input type="number" className={inputCls} value={(p[tp("offsetX")] as number) || ""} onChange={(e) => set({ [tp("offsetX")]: Number(e.target.value) || undefined })} placeholder="0" />
                </label>
                <label className={labelCls}>Offset Y
                  <input type="number" className={inputCls} value={(p[tp("offsetY")] as number) || ""} onChange={(e) => set({ [tp("offsetY")]: Number(e.target.value) || undefined })} placeholder="0" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className={labelCls}>Skew X
                  <input type="number" className={inputCls} value={(p[tp("skewX")] as number) || ""} onChange={(e) => set({ [tp("skewX")]: Number(e.target.value) || undefined })} min={-45} max={45} placeholder="0" />
                </label>
                <label className={labelCls}>Skew Y
                  <input type="number" className={inputCls} value={(p[tp("skewY")] as number) || ""} onChange={(e) => set({ [tp("skewY")]: Number(e.target.value) || undefined })} min={-45} max={45} placeholder="0" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className={labelCls}>Flip Horizontal</span>
                  <div className="mt-1 flex gap-1">
                    <button type="button" onClick={() => set({ [tp("flipH")]: false })} className={`flex h-8 flex-1 items-center justify-center rounded border text-sm ${p[tp("flipH")] !== true ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`}>Off</button>
                    <button type="button" onClick={() => set({ [tp("flipH")]: true })} className={`flex h-8 flex-1 items-center justify-center rounded border text-sm ${p[tp("flipH")] === true ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`}>On</button>
                  </div>
                </div>
                <div>
                  <span className={labelCls}>Flip Vertical</span>
                  <div className="mt-1 flex gap-1">
                    <button type="button" onClick={() => set({ [tp("flipV")]: false })} className={`flex h-8 flex-1 items-center justify-center rounded border text-sm ${p[tp("flipV")] !== true ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`}>Off</button>
                    <button type="button" onClick={() => set({ [tp("flipV")]: true })} className={`flex h-8 flex-1 items-center justify-center rounded border text-sm ${p[tp("flipV")] === true ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`}>On</button>
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
              <ToggleTab active={bgState} onChange={setBgState} />

              <div>
                <span className={labelCls}>Background Type</span>
                <div className="mt-1 flex gap-1">
                  <button type="button" onClick={() => set({ [gp("bgType")]: "classic" })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${((p[gp("bgType")] as string) || "classic") === "classic" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title="Classic">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </button>
                  <button type="button" onClick={() => set({ [gp("bgType")]: "gradient" })} className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${p[gp("bgType")] === "gradient" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`} title="Gradient">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                  </button>
                </div>
              </div>

              {(p[gp("bgType")] || "classic") === "classic" ? (
                <>
                  <label className={labelCls}>Background Color
                    <div className="flex items-center gap-2">
                      <input type="color" className="h-10 w-12 rounded-lg border border-zinc-300" value={(p[gp("bgColor")] as string) || "#ffffff"} onChange={(e) => set({ [gp("bgColor")]: e.target.value })} />
                      <input className={inputCls} value={(p[gp("bgColor")] as string) || ""} onChange={(e) => set({ [gp("bgColor")]: e.target.value })} placeholder="#ffffff" />
                    </div>
                  </label>

                  <label className={labelCls}>Background Image
                    <input type="text" className={inputCls} value={(p[gp("bgImage")] as string) || ""} onChange={(e) => set({ [gp("bgImage")]: e.target.value })} placeholder="URL" />
                  </label>

                  {Boolean(p[gp("bgImage")]) && (
                    <>
                      <label className={labelCls}>Position
                        <select className={inputCls} value={(p[gp("bgPosition")] as string) || "center center"} onChange={(e) => set({ [gp("bgPosition")]: e.target.value })}>
                          {["center center", "top left", "top center", "top right", "center left", "center right", "bottom left", "bottom center", "bottom right"].map((pos) => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                      </label>
                      <label className={labelCls}>Size
                        <select className={inputCls} value={(p[gp("bgSize")] as string) || "cover"} onChange={(e) => set({ [gp("bgSize")]: e.target.value })}>
                          <option value="auto">Auto</option>
                          <option value="cover">Cover</option>
                          <option value="contain">Contain</option>
                        </select>
                      </label>
                      <label className={labelCls}>Repeat
                        <select className={inputCls} value={(p[gp("bgRepeat")] as string) || "no-repeat"} onChange={(e) => set({ [gp("bgRepeat")]: e.target.value })}>
                          <option value="repeat">Repeat</option>
                          <option value="no-repeat">No Repeat</option>
                          <option value="repeat-x">Repeat X</option>
                          <option value="repeat-y">Repeat Y</option>
                        </select>
                      </label>
                    </>
                  )}
                </>
              ) : (
                <>
                  <label className={labelCls}>Gradient Color
                    <div className="flex items-center gap-2">
                      <input type="color" className="h-10 w-12 rounded-lg border border-zinc-300" value={(p[gp("bgGradientStart")] as string) || "#000000"} onChange={(e) => set({ [gp("bgGradientStart")]: e.target.value })} />
                      <input className={inputCls} value={(p[gp("bgGradientStart")] as string) || ""} onChange={(e) => set({ [gp("bgGradientStart")]: e.target.value })} placeholder="#000000" />
                    </div>
                  </label>
                  <label className={labelCls}>Gradient Color (End)
                    <div className="flex items-center gap-2">
                      <input type="color" className="h-10 w-12 rounded-lg border border-zinc-300" value={(p[gp("bgGradientEnd")] as string) || "#ffffff"} onChange={(e) => set({ [gp("bgGradientEnd")]: e.target.value })} />
                      <input className={inputCls} value={(p[gp("bgGradientEnd")] as string) || ""} onChange={(e) => set({ [gp("bgGradientEnd")]: e.target.value })} placeholder="#ffffff" />
                    </div>
                  </label>
                  <label className={labelCls}>Angle
                    <div className="flex items-stretch gap-1">
                      <input type="number" className={`${inputCls} mt-0 min-w-0 flex-1`} value={(p[gp("bgGradientAngle")] as number) || ""} onChange={(e) => set({ [gp("bgGradientAngle")]: Number(e.target.value) || undefined })} min={0} max={360} placeholder="180" />
                      <span className="flex items-center text-xs text-zinc-400">deg</span>
                    </div>
                  </label>
                  <label className={labelCls}>Type
                    <select className={inputCls} value={(p[gp("bgGradientType")] as string) || "linear"} onChange={(e) => set({ [gp("bgGradientType")]: e.target.value })}>
                      <option value="linear">Linear</option>
                      <option value="radial">Radial</option>
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
              <ToggleTab active={borderState} onChange={setBorderState} />

              <label className={labelCls}>Border Type
                <select className={inputCls} value={(p[bp("borderStyle")] as string) || "none"} onChange={(e) => set({ [bp("borderStyle")]: e.target.value })}>
                  <option value="none">Default</option>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                  <option value="double">Double</option>
                </select>
              </label>

              {Boolean(p[bp("borderStyle")]) && p[bp("borderStyle")] !== "none" && (
                <div className="grid grid-cols-2 gap-2">
                  <label className={labelCls}>Width
                    <input type="number" className={inputCls} value={(p[bp("borderWidth")] as number) || 1} onChange={(e) => set({ [bp("borderWidth")]: Number(e.target.value) || 1 })} min={0} max={20} />
                  </label>
                  <label className={labelCls}>Color
                    <input type="color" className="mt-1 h-10 w-full rounded-lg border border-zinc-300" value={(p[bp("borderColor")] as string) || "#000000"} onChange={(e) => set({ [bp("borderColor")]: e.target.value })} />
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

      {/* ═══ DISPLAY CONDITIONS ═══ */}
      {allSections.includes("displayConditions") && (
        <>
          <SectionHeader label="Display Conditions" isOpen={openSection === "displayConditions"} onToggle={() => toggle("displayConditions")} />
          {openSection === "displayConditions" && (
            <div className="space-y-3 pb-3">
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <span className="text-xs text-zinc-500">Display conditions control when this element is visible on the front end.</span>
              </div>

              <label className={labelCls}>Display
                <select className={inputCls} value={(p.displayCondition as string) || "always"} onChange={(e) => set({ displayCondition: e.target.value })}>
                  <option value="always">Always</option>
                  <option value="logged_in">Logged In User</option>
                  <option value="logged_out">Logged Out User</option>
                  <option value="date_after">Date After</option>
                  <option value="date_before">Date Before</option>
                  <option value="url_contains">URL Contains</option>
                </select>
              </label>

              {(p.displayCondition as string) === "date_after" && (
                <label className={labelCls}>Date
                  <input type="date" className={inputCls} value={(p.displayConditionDate as string) || ""} onChange={(e) => set({ displayConditionDate: e.target.value })} />
                </label>
              )}

              {(p.displayCondition as string) === "date_before" && (
                <label className={labelCls}>Date
                  <input type="date" className={inputCls} value={(p.displayConditionDate as string) || ""} onChange={(e) => set({ displayConditionDate: e.target.value })} />
                </label>
              )}

              {(p.displayCondition as string) === "url_contains" && (
                <label className={labelCls}>URL Fragment
                  <input type="text" className={inputCls} value={(p.displayConditionUrl as string) || ""} onChange={(e) => set({ displayConditionUrl: e.target.value })} placeholder="e.g. ?ref=homepage" />
                </label>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ CACHE SETTINGS ═══ */}
      {allSections.includes("cacheSettings") && (
        <>
          <SectionHeader label="Cache Settings" isOpen={openSection === "cacheSettings"} onToggle={() => toggle("cacheSettings")} />
          {openSection === "cacheSettings" && (
            <div className="space-y-3 pb-3">
              <label className={labelCls}>Cache
                <select className={inputCls} value={(p.cacheSetting as string) || "default"} onChange={(e) => set({ cacheSetting: e.target.value })}>
                  <option value="default">Default</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <p className="text-[11px] leading-snug text-zinc-400">
                The default cache status for this element is: <span className="font-semibold">Active</span>. Activating cache improves loading times by storing a static version of this element.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
