"use client";

import { useState } from "react";
import { FULL_COLUMN_SPANS } from "@/lib/page-builder/types";

export const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
export const labelCls = "block text-sm font-medium text-zinc-800";

export type SpanFieldConfig = "desktop" | "tablet" | "mobile";

const SPAN_DEVICES: Array<{
  key: SpanFieldConfig;
  label: string;
  icon: string;
  allowAuto: boolean;
}> = [
  { key: "desktop", label: "Desktop", icon: "🖥", allowAuto: false },
  { key: "tablet", label: "Tablet", icon: "💻", allowAuto: true },
  { key: "mobile", label: "Mobile", icon: "📱", allowAuto: true },
];

/**
 * Elementor-style responsive column width control. Lets the user pick a width
 * (1–12 of 12) for each of Desktop / Tablet / Mobile. Tablet and Mobile also
 * support "Auto" (inherit the desktop span / the row's stack-on-mobile default).
 */
export function ResponsiveSpanFields({
  desktop,
  tablet,
  mobile,
  onDesktop,
  onTablet,
  onMobile,
}: {
  desktop: number;
  tablet?: number;
  mobile?: number;
  onDesktop: (span: number) => void;
  onTablet: (span: number | undefined) => void;
  onMobile: (span: number | undefined) => void;
}) {
  const values: Record<SpanFieldConfig, number | undefined> = {
    desktop,
    tablet,
    mobile,
  };
  const setters: Record<SpanFieldConfig, (v: number | undefined) => void> = {
    desktop: (v) => onDesktop(v ?? 6),
    tablet: onTablet,
    mobile: onMobile,
  };

  const isCustom =
    (tablet !== undefined && tablet !== desktop) ||
    (mobile !== undefined && mobile !== desktop);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {SPAN_DEVICES.map((device) => {
          const value = values[device.key] ?? "";
          return (
            <div key={device.key}>
              <span className="block text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                {device.icon} {device.label}
              </span>
              <select
                className={`${inputCls} mt-0.5`}
                value={String(value)}
                onChange={(e) =>
                  setters[device.key](
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              >
                {device.allowAuto && <option value="">Auto</option>}
                {FULL_COLUMN_SPANS.map((s) => (
                  <option key={s} value={s}>
                    {s}/12
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-zinc-400">
        {isCustom ? (
          <>
            Resolution: {mobile ?? "auto"}/12 mobile · {tablet ?? "auto"}/12 tablet ·{" "}
            {desktop}/12 desktop.
          </>
        ) : (
          <>
            {desktop}/12 on every device. Set Tablet / Mobile to Auto to fall back to
            this width (and the row’s stack rule on mobile).
          </>
        )}
      </p>
    </div>
  );
}

export function BackgroundFields({
  label = "Background",
  color,
  image,
  onColor,
  onImage,
}: {
  label?: string;
  color?: string;
  image?: string;
  onColor: (value: string) => void;
  onImage: (value: string) => void;
}) {
  const [imageUrl, setImageUrl] = useState(image ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = imageUrl ?? image;

  const handleFile = async (file: File) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Upload failed.");
      }
      setImageUrl(json.url);
      onImage(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>{label} color</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            className="h-10 w-12 rounded-lg border border-zinc-300"
            value={color || "#ffffff"}
            onChange={(e) => onColor(e.target.value)}
          />
          <input
            className={inputCls}
            value={color ?? ""}
            onChange={(e) => onColor(e.target.value)}
            placeholder="No background color"
          />
        </div>
        {color && (
          <button
            type="button"
            onClick={() => onColor("")}
            className="mt-1 text-[11px] text-zinc-400 underline underline-offset-2 hover:text-zinc-600"
          >
            Clear color
          </button>
        )}
      </div>

      <div>
        <label className={labelCls}>{label} image</label>
        <input
          type="file"
          accept="image/*"
          className="mt-1 block w-full text-sm text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {uploading && <p className="mt-1 text-xs text-zinc-500">Uploading…</p>}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <div>
        <label className={labelCls}>{label} image URL</label>
        <input
          className={inputCls}
          value={value}
          onChange={(e) => {
            setImageUrl(e.target.value);
            onImage(e.target.value);
          }}
          placeholder="https://… or /api/assets/…"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setImageUrl("");
              onImage("");
            }}
            className="mt-1 text-[11px] text-zinc-400 underline underline-offset-2 hover:text-zinc-600"
          >
            Clear image
          </button>
        )}
      </div>
    </div>
  );
}
