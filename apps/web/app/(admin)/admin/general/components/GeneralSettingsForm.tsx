"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneralSettings } from "../types";
import {
  DATE_FORMAT_OPTIONS,
  TIME_FORMAT_OPTIONS,
  TIMEZONE_OPTIONS,
  LANGUAGE_OPTIONS,
  WEEK_START_OPTIONS,
} from "../types";
import { saveGeneralSettings } from "../actions";

export default function GeneralSettingsForm({ settings }: { settings: GeneralSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const set = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleIconUpload(file: File) {
    setUploadingIcon(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
      set("siteIconUrl", json.url);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Upload failed." });
    } finally {
      setUploadingIcon(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("siteTitle", form.siteTitle);
    fd.set("tagline", form.tagline);
    fd.set("siteIconUrl", form.siteIconUrl);
    fd.set("siteUrl", form.siteUrl);
    fd.set("adminEmail", form.adminEmail);
    fd.set("membership", form.membership ? "on" : "off");
    fd.set("defaultRole", form.defaultRole);
    fd.set("language", form.language);
    fd.set("timezone", form.timezone);
    fd.set("dateFormat", form.dateFormat);
    fd.set("customDateFormat", form.customDateFormat);
    fd.set("timeFormat", form.timeFormat);
    fd.set("customTimeFormat", form.customTimeFormat);
    fd.set("weekStartsOn", form.weekStartsOn);

    const result = await saveGeneralSettings(fd);
    setSaving(false);
    if (result.ok) {
      setMessage({ type: "ok", text: "Settings saved." });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.error });
    }
  }

  const labelCls = "block text-sm font-medium text-zinc-700";
  const inputCls =
    "mt-1 block w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";
  const selectCls =
    "mt-1 block w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";
  const hintCls = "mt-1 text-xs text-zinc-400";

  return (
    <div className="space-y-0">
      {/* ── Site Identity ─────────────────────────────────────────── */}
      <div className="rounded-t-lg border border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Site Identity</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Site Title</label>
            <input
              type="text"
              className={inputCls}
              value={form.siteTitle}
              onChange={(e) => set("siteTitle", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Tagline</label>
            <input
              type="text"
              className={inputCls}
              value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)}
            />
            <p className={hintCls}>
              In a few words, explain what this site is about. Example: &quot;Just another directory site.&quot;
            </p>
          </div>
          <div>
            <label className={labelCls}>Site Icon</label>
            <p className={hintCls}>
              The Site Icon is what you see in browser tabs, bookmark bars, and within mobile apps.
              It should be square and at least 512 by 512 pixels.
            </p>
            {form.siteIconUrl ? (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={form.siteIconUrl}
                  alt="Site icon preview"
                  className="h-16 w-16 rounded border border-zinc-200 object-cover"
                />
                <div className="flex flex-col gap-1">
                  <label className="cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                    Change Site Icon
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      className="hidden"
                      disabled={uploadingIcon}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleIconUpload(file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => set("siteIconUrl", "")}
                    className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove Site Icon
                  </button>
                </div>
              </div>
            ) : (
              <label className="mt-2 flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-zinc-300 px-6 py-6 text-center hover:border-zinc-400 hover:bg-zinc-50">
                {uploadingIcon ? (
                  <p className="text-xs text-zinc-500">Uploading...</p>
                ) : (
                  <>
                    <svg
                      className="mb-2 h-8 w-8 text-zinc-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    <span className="text-xs font-medium text-zinc-600">
                      Click to upload a site icon
                    </span>
                    <span className="text-[10px] text-zinc-400">JPG, PNG, WebP (square, 512x512+)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      className="hidden"
                      disabled={uploadingIcon}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleIconUpload(file);
                      }}
                    />
                  </>
                )}
              </label>
            )}
          </div>
        </div>
      </div>

      {/* ── General ───────────────────────────────────────────────── */}
      <div className="border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">General</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Site Address (URL)</label>
            <input
              type="url"
              className={inputCls}
              value={form.siteUrl}
              onChange={(e) => set("siteUrl", e.target.value)}
            />
            <p className={hintCls}>
              Enter the same address here unless you want your site home page to be different from
              your installation directory.
            </p>
          </div>
          <div>
            <label className={labelCls}>Administration Email Address</label>
            <input
              type="email"
              className={inputCls}
              value={form.adminEmail}
              onChange={(e) => set("adminEmail", e.target.value)}
            />
            <p className={hintCls}>
              This address is used for admin purposes. If you change this, an email will be sent to
              your new address to confirm it. The new address will not become active until confirmed.
            </p>
          </div>
        </div>
      </div>

      {/* ── Membership ────────────────────────────────────────────── */}
      <div className="border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Membership</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.membership}
              onChange={(e) => set("membership", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
            />
            <span className="text-sm text-zinc-700">Anyone can register</span>
          </label>
          <div>
            <label className={labelCls}>New User Default Role</label>
            <select
              className={selectCls}
              value={form.defaultRole}
              onChange={(e) => set("defaultRole", e.target.value)}
            >
              <option value="EDITOR">Editor</option>
              <option value="MARKETING">Marketing</option>
              <option value="REVIEWER">Reviewer</option>
              <option value="SALES_REP">Sales Rep</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Localization ──────────────────────────────────────────── */}
      <div className="border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Localization</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Site Language</label>
            <select
              className={selectCls}
              value={form.language}
              onChange={(e) => set("language", e.target.value)}
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Timezone</label>
            <select
              className={selectCls}
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p className={hintCls}>
              Choose either a city in the same timezone as you or a UTC (Coordinated Universal Time)
              time offset.
            </p>
          </div>
        </div>
      </div>

      {/* ── Date Format ───────────────────────────────────────────── */}
      <div className="border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Date Format</h2>
        <div className="space-y-2">
          {DATE_FORMAT_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-3">
              <input
                type="radio"
                name="dateFormat"
                value={opt.value}
                checked={form.dateFormat === opt.value && !form.customDateFormat}
                onChange={() => {
                  set("dateFormat", opt.value);
                  set("customDateFormat", "");
                }}
                className="h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-500"
              />
              <span className="text-sm text-zinc-700">{opt.label}</span>
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                {opt.value}
              </code>
            </label>
          ))}
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="dateFormat"
              value="custom"
              checked={!!form.customDateFormat}
              onChange={() => set("dateFormat", "")}
              className="h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-500"
            />
            <span className="text-sm text-zinc-700">Custom:</span>
            <input
              type="text"
              className="w-32 rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              value={form.customDateFormat}
              onChange={(e) => set("customDateFormat", e.target.value)}
              placeholder="F j, Y"
            />
          </label>
        </div>
      </div>

      {/* ── Time Format ───────────────────────────────────────────── */}
      <div className="border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Time Format</h2>
        <div className="space-y-2">
          {TIME_FORMAT_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-3">
              <input
                type="radio"
                name="timeFormat"
                value={opt.value}
                checked={form.timeFormat === opt.value && !form.customTimeFormat}
                onChange={() => {
                  set("timeFormat", opt.value);
                  set("customTimeFormat", "");
                }}
                className="h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-500"
              />
              <span className="text-sm text-zinc-700">{opt.label}</span>
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                {opt.value}
              </code>
            </label>
          ))}
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="timeFormat"
              value="custom"
              checked={!!form.customTimeFormat}
              onChange={() => set("timeFormat", "")}
              className="h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-500"
            />
            <span className="text-sm text-zinc-700">Custom:</span>
            <input
              type="text"
              className="w-32 rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              value={form.customTimeFormat}
              onChange={(e) => set("customTimeFormat", e.target.value)}
              placeholder="g:i a"
            />
          </label>
        </div>
      </div>

      {/* ── Week Starts On ────────────────────────────────────────── */}
      <div className="rounded-b-lg border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Week Starts On</h2>
        <select
          className={selectCls}
          value={form.weekStartsOn}
          onChange={(e) => set("weekStartsOn", e.target.value)}
        >
          {WEEK_START_OPTIONS.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </div>

      {/* ── Save ──────────────────────────────────────────────────── */}
      <div className="mt-6 flex items-center gap-3">
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
  );
}
