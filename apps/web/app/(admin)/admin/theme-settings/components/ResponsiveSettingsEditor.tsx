"use client";

import type { ResponsiveSettings, FontSizeSet } from "@/lib/theme-settings";

const DEVICES = [
  { key: "mobile" as const, label: "Mobile", icon: "📱", desc: "Phones in portrait mode" },
  { key: "tablet" as const, label: "Tablet", icon: "💻", desc: "Tablets and phones in landscape" },
  { key: "desktop" as const, label: "Desktop", icon: "🖥", desc: "Desktops and laptops" },
];

const FONT_SIZE_FIELDS = [
  { key: "h1" as const, label: "H1" },
  { key: "h2" as const, label: "H2" },
  { key: "h3" as const, label: "H3" },
  { key: "h4" as const, label: "H4" },
  { key: "body" as const, label: "Body" },
  { key: "small" as const, label: "Small" },
];

export default function ResponsiveSettingsEditor({
  responsive,
  fonts,
}: {
  responsive: ResponsiveSettings;
  fonts: { mobile: FontSizeSet; tablet: FontSizeSet; desktop: FontSizeSet };
}) {
  return (
    <div className="space-y-5">
      {/* Breakpoint Values */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          Breakpoint Values (px)
        </h3>
        <p className="mt-1 text-[11px] text-zinc-500">
          Define the screen width thresholds for each device type. Changes affect
          how the page builder handles responsive column spans.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {DEVICES.map((device) => (
            <label key={device.key} className="block text-xs font-medium text-zinc-600">
              {device.icon} {device.label} breakpoint
              <span className="block text-[10px] font-normal text-zinc-400">{device.desc}</span>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number"
                  name={`bp${device.key.charAt(0).toUpperCase() + device.key.slice(1)}`}
                  min={0}
                  max={2560}
                  defaultValue={responsive.breakpoints[device.key]}
                  className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <span className="text-xs text-zinc-400">px</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Container Padding per Device */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          Container Padding per Device
        </h3>
        <p className="mt-1 text-[11px] text-zinc-500">
          Override the container padding for each device size. This controls
          how much horizontal space surrounds the main content area.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {DEVICES.map((device) => (
            <label key={device.key} className="block text-xs font-medium text-zinc-600">
              {device.icon} {device.label} padding
              <input
                type="text"
                name={`cp${device.key.charAt(0).toUpperCase() + device.key.slice(1)}`}
                defaultValue={responsive.containerPadding[device.key]}
                placeholder="e.g., 16px"
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Font Size Preview per Device */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          Default Font Sizes per Device (px)
        </h3>
        <p className="mt-1 text-[11px] text-zinc-500">
          These are the site-wide default font sizes. Per-block overrides in the
          page builder take precedence.
        </p>
        <div className="mt-3 space-y-3">
          {DEVICES.map((device) => (
            <div key={device.key} className="rounded-lg border border-zinc-100 p-3">
              <span className="block text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                {device.icon} {device.label}
              </span>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {FONT_SIZE_FIELDS.map((field) => (
                  <label key={field.key} className="block text-[10px] text-zinc-500">
                    {field.label}
                    <input
                      type="number"
                      name={`${device.key}${field.key.charAt(0).toUpperCase() + field.key.slice(1)}`}
                      min={8}
                      max={120}
                      defaultValue={fonts[device.key][field.key]}
                      className="mt-0.5 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
