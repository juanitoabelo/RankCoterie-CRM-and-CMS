"use client";

import { useFormStatus } from "react-dom";
import { applyPresetForm } from "../actions";
import { THEME_PRESETS } from "@/lib/theme-settings";

function SubmitButton({ presetId, active }: { presetId: string; active: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="presetId"
      value={presetId}
      disabled={pending}
      className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
        active
          ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500"
          : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50"
      } ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 gap-1">
          <span
            className="h-4 w-4 rounded-full border border-zinc-200"
            style={{ backgroundColor: THEME_PRESETS.find((p) => p.id === presetId)?.colors.accent }}
          />
          <span
            className="h-4 w-4 rounded-full border border-zinc-200"
            style={{ backgroundColor: THEME_PRESETS.find((p) => p.id === presetId)?.colors.buttonBg }}
          />
          <span
            className="h-4 w-4 rounded-full border border-zinc-200"
            style={{ backgroundColor: THEME_PRESETS.find((p) => p.id === presetId)?.colors.background }}
          />
        </div>
        <span className="text-sm font-medium text-zinc-900">
          {THEME_PRESETS.find((p) => p.id === presetId)?.name}
        </span>
        {active && (
          <span className="ml-auto rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
            Active
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        {THEME_PRESETS.find((p) => p.id === presetId)?.description}
      </p>
    </button>
  );
}

export default function ThemePresetPicker({ activePreset }: { activePreset: string | null }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-3">
        Choose a predefined theme preset. This will apply a complete set of colors,
        fonts, and layout settings. You can then customize individual values below.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {THEME_PRESETS.map((preset) => (
          <form key={preset.id} action={applyPresetForm}>
            <SubmitButton presetId={preset.id} active={activePreset === preset.id} />
          </form>
        ))}
      </div>
    </div>
  );
}
