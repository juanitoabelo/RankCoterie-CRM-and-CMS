"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomCssJsSettings } from "../types";
import { saveCustomCssJsSettings } from "../actions";

export default function CustomCssJsForm({ settings }: { settings: CustomCssJsSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<CustomCssJsSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const set = <K extends keyof CustomCssJsSettings>(
    key: K,
    value: CustomCssJsSettings[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("customCss", form.customCss);
    fd.set("customJs", form.customJs);

    const result = await saveCustomCssJsSettings(fd);
    setSaving(false);
    if (result.ok) {
      setMessage({ type: "ok", text: "Custom CSS/JS saved." });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.error });
    }
  }

  const textareaCls =
    "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 resize-y min-h-[120px]";

  return (
    <div className="space-y-0">
      {/* ── Custom CSS ───────────────────────────────────────────────── */}
      <div className="rounded-t-lg border border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Custom CSS</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Add custom CSS that will be injected globally into the site <em className="text-zinc-600">head</em>.
          Useful for overrides, custom colors, typography, or layout tweaks.
        </p>
        <textarea
          value={form.customCss}
          onChange={(e) => set("customCss", e.target.value)}
          className={textareaCls}
          placeholder="/* Your custom CSS here */"
        />
      </div>

      {/* ── Custom JS ────────────────────────────────────────────────── */}
      <div className="border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Custom JavaScript</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Add custom JavaScript that will be injected globally before the closing <em className="text-zinc-600">body</em> tag.
          Useful for analytics, widgets, or custom functionality.
        </p>
        <textarea
          value={form.customJs}
          onChange={(e) => set("customJs", e.target.value)}
          className={textareaCls}
          placeholder="// Your custom JS here\n// Example: gtag('config', 'GA_MEASUREMENT_ID');"
        />
      </div>

      {/* ── Save ───────────────────────────────────────────────────────── */}
      <div className="mt-6 border-t border-zinc-200 bg-white px-6 py-5">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {message && (
            <span
              className={`text-sm ${
                message.type === "ok" ? "text-green-600" : "text-red-600"
              }`}
            >
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}