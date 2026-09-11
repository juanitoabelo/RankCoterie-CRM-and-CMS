"use client";

import type { ColorPalette } from "@/lib/theme-settings";

const COLOR_GROUPS = [
  {
    label: "Base Colors",
    colors: [
      { key: "background" as const, label: "Page Background" },
      { key: "text" as const, label: "Body Text" },
      { key: "headingColor" as const, label: "Heading Color" },
      { key: "surface" as const, label: "Surface / Card BG" },
      { key: "border" as const, label: "Border Color" },
      { key: "muted" as const, label: "Muted / Secondary Text" },
    ],
  },
  {
    label: "Brand Colors",
    colors: [
      { key: "accent" as const, label: "Accent / Brand" },
      { key: "linkColor" as const, label: "Link Color" },
      { key: "linkHoverColor" as const, label: "Link Hover" },
      { key: "buttonBg" as const, label: "Button Background" },
      { key: "buttonText" as const, label: "Button Text" },
    ],
  },
  {
    label: "Status Colors",
    colors: [
      { key: "success" as const, label: "Success" },
      { key: "warning" as const, label: "Warning" },
      { key: "error" as const, label: "Error" },
    ],
  },
];

export default function ColorPaletteEditor({ colors }: { colors: ColorPalette }) {
  return (
    <div className="space-y-4">
      {COLOR_GROUPS.map((group) => (
        <div key={group.label}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
            {group.label}
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.colors.map((c) => (
              <label key={c.key} className="block text-xs font-medium text-zinc-600">
                {c.label}
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    name={`color${c.key.charAt(0).toUpperCase() + c.key.slice(1)}`}
                    defaultValue={colors[c.key]}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
                  />
                  <input
                    type="text"
                    defaultValue={colors[c.key]}
                    className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono"
                    readOnly
                  />
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
