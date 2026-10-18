"use client";

import HeaderFooterRenderer from "@/components/admin/header-footer-builder/HeaderFooterRenderer";
import { PRESET_PREVIEW_MENUS, type HeaderFooterPreset } from "@/lib/header-footer/presets";

/**
 * Miniature, non-interactive render of a starter template. The full header /
 * footer renderer is mounted inside a scaled, clipped viewport so the thumbnail
 * matches the real output (logo, menus, gradients and all).
 */
export default function PresetPreview({
  preset,
  height = 116,
}: {
  preset: HeaderFooterPreset;
  height?: number;
}) {
  const scale = 0.32;
  return (
    <div
      className="pointer-events-none relative w-full select-none overflow-hidden rounded-md border border-zinc-200 bg-white"
      style={{ height }}
      aria-hidden="true"
    >
      <div
        style={{
          width: `${100 / scale}%`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <HeaderFooterRenderer
          blocks={preset.blocks}
          containerSettings={preset.containerSettings}
          menus={PRESET_PREVIEW_MENUS}
        />
      </div>
    </div>
  );
}
