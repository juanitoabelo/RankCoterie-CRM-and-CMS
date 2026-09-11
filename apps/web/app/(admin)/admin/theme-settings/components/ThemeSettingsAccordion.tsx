"use client";

import { useState } from "react";
import { saveThemeSettingsForm, applyPresetForm } from "../actions";
import ThemePresetPicker from "./ThemePresetPicker";
import ColorPaletteEditor from "./ColorPaletteEditor";
import FontSettingsEditor from "./FontSettingsEditor";
import LayoutSettingsEditor from "./LayoutSettingsEditor";
import ResponsiveSettingsEditor from "./ResponsiveSettingsEditor";
import type { ThemeSettings } from "@/lib/theme-settings";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
    </svg>
  );
}

function SwatchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function TypeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function LayoutIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  );
}

function AccordionSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-zinc-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 bg-zinc-100 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700 hover:bg-zinc-200"
      >
        {icon}
        {title}
        <span className="ml-auto">
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && <div className="bg-zinc-50 px-4 py-4">{children}</div>}
    </div>
  );
}

export default function ThemeSettingsAccordion({ settings }: { settings: ThemeSettings }) {
  return (
    <div className="space-y-3">
      {/* ── THEME PRESETS ──────────────────────────────────────────────── */}
      <AccordionSection title="Theme Presets" icon={<PaletteIcon />} defaultOpen>
        <ThemePresetPicker activePreset={settings.activePreset} />
      </AccordionSection>

      {/* ── COLOR PALETTE ──────────────────────────────────────────────── */}
      <AccordionSection title="Color Palette" icon={<SwatchIcon />}>
        <form action={saveThemeSettingsForm}>
          <input type="hidden" name="activePreset" value={settings.activePreset ?? ""} />
          <ColorPaletteEditor colors={settings.colors} />
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <button
              type="submit"
              className="rounded bg-amber-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-amber-700"
            >
              Save colors
            </button>
          </div>
        </form>
      </AccordionSection>

      {/* ── TYPOGRAPHY ──────────────────────────────────────────────── */}
      <AccordionSection title="Typography" icon={<TypeIcon />}>
        <form action={saveThemeSettingsForm}>
          <input type="hidden" name="activePreset" value={settings.activePreset ?? ""} />
          <FontSettingsEditor fonts={settings.fonts} />
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <button
              type="submit"
              className="rounded bg-amber-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-amber-700"
            >
              Save typography
            </button>
          </div>
        </form>
      </AccordionSection>

      {/* ── LAYOUT ──────────────────────────────────────────────── */}
      <AccordionSection title="Template Layout" icon={<LayoutIcon />}>
        <form action={saveThemeSettingsForm}>
          <input type="hidden" name="activePreset" value={settings.activePreset ?? ""} />
          <LayoutSettingsEditor layout={settings.layout} />
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <button
              type="submit"
              className="rounded bg-amber-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-amber-700"
            >
              Save layout
            </button>
          </div>
        </form>
      </AccordionSection>

      {/* ── RESPONSIVE ──────────────────────────────────────────────── */}
      <AccordionSection title="Responsive Settings" icon={<DeviceIcon />}>
        <form action={saveThemeSettingsForm}>
          <input type="hidden" name="activePreset" value={settings.activePreset ?? ""} />
          <ResponsiveSettingsEditor responsive={settings.responsive} fonts={settings.fonts.sizes} />
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <button
              type="submit"
              className="rounded bg-amber-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-amber-700"
            >
              Save responsive settings
            </button>
          </div>
        </form>
      </AccordionSection>
    </div>
  );
}
