"use client";

import type { FontSettings } from "@/lib/theme-settings";
import { FONT_FAMILY_OPTIONS } from "@/lib/theme-settings";

const FONT_SIZE_FIELDS = [
  { key: "h1" as const, label: "H1" },
  { key: "h2" as const, label: "H2" },
  { key: "h3" as const, label: "H3" },
  { key: "h4" as const, label: "H4" },
  { key: "body" as const, label: "Body" },
  { key: "small" as const, label: "Small" },
];

const DEVICES = [
  { key: "mobile" as const, label: "Mobile", icon: "📱" },
  { key: "tablet" as const, label: "Tablet", icon: "💻" },
  { key: "desktop" as const, label: "Desktop", icon: "🖥" },
];

export default function FontSettingsEditor({ fonts }: { fonts: FontSettings }) {
  return (
    <div className="space-y-5">
      {/* Font Families */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          Font Families
        </h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-medium text-zinc-600">
            Heading Font
            <select
              name="fontHeading"
              defaultValue={fonts.heading}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {FONT_FAMILY_OPTIONS.map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value || undefined }}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Body Font
            <select
              name="fontBody"
              defaultValue={fonts.body}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {FONT_FAMILY_OPTIONS.map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value || undefined }}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Monospace Font
            <select
              name="fontMono"
              defaultValue={fonts.mono}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {FONT_FAMILY_OPTIONS.filter((f) =>
                f.value.includes("monospace") || f.value.includes("Mono") || f.label === "Custom..."
              ).map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value || undefined }}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Font Sizes per Device */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          Font Sizes (px)
        </h3>
        <p className="mt-1 text-[11px] text-zinc-500">
          Set default font sizes for each device type. These apply site-wide and
          can be overridden per block in the page builder.
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
                      defaultValue={fonts.sizes[device.key][field.key]}
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
