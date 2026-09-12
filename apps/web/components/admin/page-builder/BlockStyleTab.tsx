"use client";

import { useState } from "react";
import { inputCls, labelCls } from "./settings";

/* ── Types ───────────────────────────────────────────────────────────────── */

export interface StyleTabProps {
  /** Current block props (raw Record<string, unknown>) */
  props: Record<string, unknown>;
  /** Setter that merges partial props into the block */
  set: (patch: Record<string, unknown>) => void;
  /** Which sections to show. Defaults to all. */
  show?: StyleSection[];
  /** Optional global color palette override */
  themeColors?: string[];
}

export type StyleSection =
  | "alignment"
  | "typography"
  | "textShadow"
  | "paragraphSpacing"
  | "textColor"
  | "linkColor";

/* ── Constants ───────────────────────────────────────────────────────────── */

const ALIGN_OPTIONS = [
  { value: "left", icon: "⫶", label: "Left" },
  { value: "center", icon: "⫶", label: "Center" },
  { value: "right", icon: "⫶", label: "Right" },
  { value: "justify", icon: "☰", label: "Justify" },
] as const;

const FONT_FAMILIES = [
  { value: "", label: "Default" },
  { value: "inherit", label: "Inherit" },
  { value: "Arial, Helvetica, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Times New Roman', Times, serif", label: "Times" },
  { value: "'Courier New', Courier, monospace", label: "Courier" },
  { value: "Verdana, Geneva, sans-serif", label: "Verdana" },
];

const FONT_WEIGHTS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];

const TEXT_TRANSFORMS = ["none", "uppercase", "lowercase", "capitalize"];
const TEXT_DECORATIONS = ["none", "underline", "overline", "line-through"];

/* ── Component ───────────────────────────────────────────────────────────── */

export default function BlockStyleTab({ props: p, set, show, themeColors }: StyleTabProps) {
  const [activeColorTab, setActiveColorTab] = useState<"normal" | "hover">("normal");
  const sections = show ?? (["alignment", "typography", "textShadow", "paragraphSpacing", "textColor", "linkColor"] as StyleSection[]);

  return (
    <div className="space-y-4">
      {/* ── Alignment ─────────────────────────────────── */}
      {sections.includes("alignment") && (
        <div>
          <span className={labelCls}>Alignment</span>
          <div className="mt-1 flex gap-1">
            {ALIGN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set({ align: opt.value })}
                className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${
                  (p.align as string) === opt.value
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
                }`}
                title={opt.label}
              >
                {opt.value === "left" && "⫷"}
                {opt.value === "center" && "⫶"}
                {opt.value === "right" && "⫸"}
                {opt.value === "justify" && "☰"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Typography ────────────────────────────────── */}
      {sections.includes("typography") && (
        <div className="space-y-3">
          <span className={labelCls}>Typography</span>

          <label className={labelCls}>Font Family
            <select className={inputCls} value={(p.fontFamily as string) || ""} onChange={(e) => set({ fontFamily: e.target.value || undefined })}>
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className={labelCls}>Font Size
              <div className="flex items-stretch gap-1">
                <input type="number" className={`${inputCls} mt-0 min-w-0 flex-1`} value={(p.fontSize as number) || ""} onChange={(e) => set({ fontSize: Number(e.target.value) || undefined })} min={1} max={999} placeholder="Auto" />
                <select className={`${inputCls} mt-0 w-16 shrink-0`} value={(p.fontSizeUnit as string) || "px"} onChange={(e) => set({ fontSizeUnit: e.target.value })}>
                  <option value="px">px</option>
                  <option value="em">em</option>
                  <option value="rem">rem</option>
                  <option value="%">%</option>
                  <option value="vw">vw</option>
                </select>
              </div>
            </label>
            <label className={labelCls}>Font Weight
              <select className={inputCls} value={(p.fontWeight as string) || "400"} onChange={(e) => set({ fontWeight: e.target.value })}>
                {FONT_WEIGHTS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className={labelCls}>Transform
              <select className={inputCls} value={(p.textTransform as string) || "none"} onChange={(e) => set({ textTransform: e.target.value })}>
                {TEXT_TRANSFORMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className={labelCls}>Decoration
              <select className={inputCls} value={(p.textDecoration as string) || "none"} onChange={(e) => set({ textDecoration: e.target.value })}>
                {TEXT_DECORATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className={labelCls}>Line Height
              <input type="number" className={inputCls} value={(p.lineHeight as number) || ""} onChange={(e) => set({ lineHeight: Number(e.target.value) || undefined })} min={0} max={3} step={0.1} placeholder="Auto" />
            </label>
            <label className={labelCls}>Letter Spacing
              <input type="number" className={inputCls} value={(p.letterSpacing as number) ?? ""} onChange={(e) => set({ letterSpacing: e.target.value ? Number(e.target.value) : undefined })} min={-10} max={20} step={0.5} placeholder="Auto" />
            </label>
          </div>

          <label className={labelCls}>Word Spacing
            <input type="number" className={inputCls} value={(p.wordSpacing as number) ?? ""} onChange={(e) => set({ wordSpacing: e.target.value ? Number(e.target.value) : undefined })} min={-10} max={50} step={0.5} placeholder="Auto" />
          </label>
        </div>
      )}

      {/* ── Text Stroke ───────────────────────────────── */}
      {sections.includes("typography") && (
        <div>
          <div className="flex items-center justify-between">
            <span className={labelCls}>Text Stroke</span>
            <span className="text-[10px] text-zinc-400">px</span>
          </div>
          <input type="number" className={inputCls} value={(p.textStroke as number) || ""} onChange={(e) => set({ textStroke: Number(e.target.value) || undefined })} min={0} max={10} placeholder="None" />
        </div>
      )}

      {/* ── Text Shadow ───────────────────────────────── */}
      {sections.includes("textShadow") && (
        <label className={labelCls}>Text Shadow
          <input type="text" className={inputCls} value={(p.textShadow as string) || ""} onChange={(e) => set({ textShadow: e.target.value })} placeholder="2px 2px 4px rgba(0,0,0,0.3)" />
        </label>
      )}

      {/* ── Paragraph Spacing ─────────────────────────── */}
      {sections.includes("paragraphSpacing") && (
        <label className={labelCls}>Paragraph Spacing
          <div className="flex items-stretch gap-1">
            <input type="range" min={0} max={100} className="mt-2 h-1 flex-1 accent-zinc-900" value={(p.paragraphSpacing as number) || 0} onChange={(e) => set({ paragraphSpacing: Number(e.target.value) || undefined })} />
            <input type="number" className={`${inputCls} mt-0 w-16`} value={(p.paragraphSpacing as number) || ""} onChange={(e) => set({ paragraphSpacing: Number(e.target.value) || undefined })} min={0} max={100} placeholder="0" />
          </div>
        </label>
      )}

      {/* ── Blend Mode ────────────────────────────────── */}
      {sections.includes("typography") && (
        <label className={labelCls}>Blend Mode
          <select className={inputCls} value={(p.blendMode as string) || "normal"} onChange={(e) => set({ blendMode: e.target.value })}>
            {["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
      )}

      {/* ── Colors (Normal / Hover) ───────────────────── */}
      {(sections.includes("textColor") || sections.includes("linkColor")) && (
        <div>
          <div className="mb-2 flex rounded-lg border border-zinc-200 p-0.5">
            <button type="button" onClick={() => setActiveColorTab("normal")} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${activeColorTab === "normal" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
              Normal
            </button>
            <button type="button" onClick={() => setActiveColorTab("hover")} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${activeColorTab === "hover" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
              Hover
            </button>
          </div>

          {activeColorTab === "normal" ? (
            <div className="space-y-3">
              {sections.includes("textColor") && (
                <label className={labelCls}>Text Color
                  <div className="flex items-center gap-2">
                    <input type="color" className="h-10 w-12 rounded-lg border border-zinc-300" value={(p.textColor as string) || "#000000"} onChange={(e) => set({ textColor: e.target.value })} />
                    <input className={inputCls} value={(p.textColor as string) || ""} onChange={(e) => set({ textColor: e.target.value })} placeholder="#000000" />
                  </div>
                </label>
              )}
              {sections.includes("linkColor") && (
                <label className={labelCls}>Link Color
                  <div className="flex items-center gap-2">
                    <input type="color" className="h-10 w-12 rounded-lg border border-zinc-300" value={(p.linkColor as string) || "#000000"} onChange={(e) => set({ linkColor: e.target.value })} />
                    <input className={inputCls} value={(p.linkColor as string) || ""} onChange={(e) => set({ linkColor: e.target.value })} placeholder="#000000" />
                  </div>
                </label>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sections.includes("textColor") && (
                <label className={labelCls}>Hover Text Color
                  <div className="flex items-center gap-2">
                    <input type="color" className="h-10 w-12 rounded-lg border border-zinc-300" value={(p.hoverColor as string) || "#000000"} onChange={(e) => set({ hoverColor: e.target.value })} />
                    <input className={inputCls} value={(p.hoverColor as string) || ""} onChange={(e) => set({ hoverColor: e.target.value })} placeholder="#000000" />
                  </div>
                </label>
              )}
              {sections.includes("linkColor") && (
                <label className={labelCls}>Hover Link Color
                  <div className="flex items-center gap-2">
                    <input type="color" className="h-10 w-12 rounded-lg border border-zinc-300" value={(p.hoverLinkColor as string) || "#000000"} onChange={(e) => set({ hoverLinkColor: e.target.value })} />
                    <input className={inputCls} value={(p.hoverLinkColor as string) || ""} onChange={(e) => set({ hoverLinkColor: e.target.value })} placeholder="#000000" />
                  </div>
                </label>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
