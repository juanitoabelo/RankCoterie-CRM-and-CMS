"use client";

import { useState } from "react";

interface PaletteColor {
  key: string;
  label: string;
  color: string;
}

const DEFAULT_GLOBAL_COLORS: PaletteColor[] = [
  { key: "background", label: "Background", color: "#ffffff" },
  { key: "text", label: "Text", color: "#171717" },
  { key: "accent", label: "Accent", color: "#2563eb" },
  { key: "headingColor", label: "Heading", color: "#111827" },
  { key: "linkColor", label: "Link", color: "#2563eb" },
  { key: "buttonBg", label: "Button BG", color: "#2563eb" },
  { key: "buttonText", label: "Button Text", color: "#ffffff" },
  { key: "surface", label: "Surface", color: "#f9fafb" },
  { key: "border", label: "Border", color: "#e5e7eb" },
  { key: "muted", label: "Muted", color: "#6b7280" },
  { key: "success", label: "Success", color: "#16a34a" },
  { key: "warning", label: "Warning", color: "#d97706" },
  { key: "error", label: "Error", color: "#dc2626" },
];

export default function GlobalColorPicker({
  value,
  onChange,
  label,
  allowClear = false,
  paletteOverride,
}: {
  value: string | undefined;
  onChange: (color: string) => void;
  label: string;
  allowClear?: boolean;
  paletteOverride?: PaletteColor[];
}) {
  const globalColors = paletteOverride && paletteOverride.length > 0
    ? paletteOverride
    : DEFAULT_GLOBAL_COLORS;

  const [mode, setMode] = useState<"global" | "custom">(
    globalColors.some((c) => c.color === value) ? "global" : "custom"
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="block text-xs font-medium text-zinc-600">{label}</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode("global")}
            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
              mode === "global" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
            }`}
          >
            Global
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
              mode === "custom" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {mode === "global" ? (
        <div className="grid grid-cols-5 gap-1.5">
          {globalColors.map((gc) => (
            <button
              key={gc.key}
              type="button"
              onClick={() => onChange(gc.color)}
              title={gc.label}
              className={`group relative h-8 w-full rounded-lg border-2 ${
                value === gc.color ? "border-zinc-900" : "border-zinc-200 hover:border-zinc-400"
              }`}
              style={{ backgroundColor: gc.color }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold opacity-0 group-hover:opacity-100" style={{ color: gc.color === "#ffffff" ? "#000" : "#fff" }}>
                {gc.label.slice(0, 3)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
          />
          <input
            type="text"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 font-mono text-xs"
          />
        </div>
      )}

      {allowClear && value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-[10px] text-zinc-400 hover:text-zinc-600"
        >
          Clear color
        </button>
      )}
    </div>
  );
}
