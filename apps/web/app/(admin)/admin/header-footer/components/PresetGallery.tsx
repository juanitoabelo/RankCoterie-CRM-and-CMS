"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  HEADER_PRESETS,
  FOOTER_PRESETS,
  type HeaderFooterPreset,
} from "@/lib/header-footer/presets";
import { createHeaderFooterFromPresetAction } from "../actions";
import PresetPreview from "./PresetPreview";

/**
 * Grid of built-in starter templates. Choosing one seeds a real, editable
 * template from the preset and jumps straight into the builder.
 */
export default function PresetGallery({
  type,
  previewHeight,
  compact = false,
}: {
  type: "HEADER" | "FOOTER";
  previewHeight?: number;
  compact?: boolean;
}) {
  const presets: HeaderFooterPreset[] = type === "HEADER" ? HEADER_PRESETS : FOOTER_PRESETS;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const usePreset = async (preset: HeaderFooterPreset) => {
    setBusyId(preset.id);
    setError(null);
    const result = await createHeaderFooterFromPresetAction(preset.id);
    if (result.ok && result.id) {
      router.push(`/admin/header-footer/${result.id}/edit`);
      return;
    }
    setBusyId(null);
    setError(result.ok ? "Failed to create template." : result.error);
  };

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
      <div className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white"
          >
            <PresetPreview preset={preset} height={previewHeight ?? (type === "HEADER" ? 104 : 148)} />
            <div className="flex flex-1 flex-col p-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-900">{preset.name}</h3>
                {preset.badge && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    {preset.badge}
                  </span>
                )}
              </div>
              <p className="mt-1 flex-1 text-xs leading-snug text-zinc-500">{preset.description}</p>
              <button
                type="button"
                onClick={() => usePreset(preset)}
                disabled={busyId !== null}
                className="mt-3 rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {busyId === preset.id ? "Creating…" : "Use this template"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
