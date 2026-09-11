"use client";

import type { LayoutSettings } from "@/lib/theme-settings";

const MAX_WIDTH_OPTIONS = [
  { value: "1024px", label: "1024px — Narrow" },
  { value: "1200px", label: "1200px — Default" },
  { value: "1400px", label: "1400px — Wide" },
  { value: "100%", label: "100% — Full Width" },
];

const CONTAINER_PADDING_OPTIONS = [
  { value: "16px", label: "16px — Compact" },
  { value: "24px", label: "24px — Default" },
  { value: "32px", label: "32px — Comfortable" },
  { value: "48px", label: "48px — Spacious" },
];

const HEADER_STYLES = [
  { value: "default", label: "Default — Logo left, nav right" },
  { value: "centered", label: "Centered — Logo + nav centered" },
  { value: "minimal", label: "Minimal — Slim bar, minimal elements" },
  { value: "full-width", label: "Full Width — Edge to edge" },
];

const FOOTER_STYLES = [
  { value: "default", label: "Default — Multi-column footer" },
  { value: "centered", label: "Centered — Centered copyright + links" },
  { value: "minimal", label: "Minimal — Simple bottom bar" },
  { value: "full-width", label: "Full Width — Edge to edge" },
];

const SIDEBAR_POSITIONS = [
  { value: "none", label: "No Sidebar" },
  { value: "left", label: "Left Sidebar" },
  { value: "right", label: "Right Sidebar" },
];

const CONTENT_SPACING = [
  { value: "compact", label: "Compact — Tighter spacing" },
  { value: "default", label: "Default — Standard spacing" },
  { value: "relaxed", label: "Relaxed — More breathing room" },
];

function SelectField({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-xs font-medium text-zinc-600">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function LayoutSettingsEditor({ layout }: { layout: LayoutSettings }) {
  return (
    <div className="space-y-4">
      {/* Page Container */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          Page Container
        </h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <SelectField
            name="layoutMaxWidth"
            label="Max Content Width"
            defaultValue={layout.maxWidth}
            options={MAX_WIDTH_OPTIONS}
          />
          <SelectField
            name="layoutContainerPadding"
            label="Container Padding"
            defaultValue={layout.containerPadding}
            options={CONTAINER_PADDING_OPTIONS}
          />
        </div>
      </div>

      {/* Header */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          Header Style
        </h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {HEADER_STYLES.map((style) => (
            <label
              key={style.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                layout.headerStyle === style.value
                  ? "border-amber-500 bg-amber-50"
                  : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              <input
                type="radio"
                name="layoutHeaderStyle"
                value={style.value}
                defaultChecked={layout.headerStyle === style.value}
                className="accent-amber-600"
              />
              <span className="text-xs text-zinc-700">{style.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          Footer Style
        </h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {FOOTER_STYLES.map((style) => (
            <label
              key={style.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                layout.footerStyle === style.value
                  ? "border-amber-500 bg-amber-50"
                  : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              <input
                type="radio"
                name="layoutFooterStyle"
                value={style.value}
                defaultChecked={layout.footerStyle === style.value}
                className="accent-amber-600"
              />
              <span className="text-xs text-zinc-700">{style.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sidebar & Spacing */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          Sidebar & Spacing
        </h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <SelectField
            name="layoutSidebarPosition"
            label="Sidebar Position"
            defaultValue={layout.sidebarPosition}
            options={SIDEBAR_POSITIONS}
          />
          <SelectField
            name="layoutContentSpacing"
            label="Content Spacing"
            defaultValue={layout.contentSpacing}
            options={CONTENT_SPACING}
          />
        </div>
      </div>
    </div>
  );
}
