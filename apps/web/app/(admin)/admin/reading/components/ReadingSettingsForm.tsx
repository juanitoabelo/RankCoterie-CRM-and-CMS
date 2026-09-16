"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PageOption, ReadingSettings } from "../types";
import { saveReadingSettings } from "../actions";

export default function ReadingSettingsForm({
  pages,
  settings,
}: {
  pages: PageOption[];
  settings: ReadingSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const set = <K extends keyof ReadingSettings>(key: K, value: ReadingSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("homepageDisplays", form.homepageDisplays);
    fd.set("homepagePageId", form.homepagePageId ?? "");
    fd.set("postsPageId", form.postsPageId ?? "");
    fd.set("postsPerPage", String(form.postsPerPage));
    fd.set("feedsPerPage", String(form.feedsPerPage));
    fd.set("feedFormat", form.feedFormat);
    fd.set("searchEngineVisibility", form.searchEngineVisibility);

    const result = await saveReadingSettings(fd);
    setSaving(false);
    if (result.ok) {
      setMessage({ type: "ok", text: "Settings saved." });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.error });
    }
  }

  const livePages = pages.filter((p) => p.status === "LIVE");
  const isStatic = form.homepageDisplays === "static";

  return (
    <div className="space-y-0">
      {/* ── Homepage displays ─────────────────────────────────────── */}
      <div className="rounded-t-lg border border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Your homepage displays</h2>

        <div className="space-y-3">
          <label className="flex items-start gap-3">
            <input
              type="radio"
              name="homepageDisplays"
              value="latest"
              checked={!isStatic}
              onChange={() => set("homepageDisplays", "latest")}
              className="mt-0.5 h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-500"
            />
            <span className="text-sm text-zinc-700">Your latest posts</span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="radio"
              name="homepageDisplays"
              value="static"
              checked={isStatic}
              onChange={() => set("homepageDisplays", "static")}
              className="mt-0.5 h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-500"
            />
            <span className="text-sm text-zinc-700">
              A <span className="underline">static page</span> (select below)
            </span>
          </label>
        </div>

        {/* Homepage / Posts page dropdowns */}
        {isStatic && (
          <div className="mt-4 ml-7 space-y-3">
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium text-zinc-700">Homepage:</label>
              <select
                value={form.homepagePageId ?? ""}
                onChange={(e) => set("homepagePageId", e.target.value || null)}
                className="w-64 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              >
                <option value="">— Select a page —</option>
                {livePages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-28 text-sm font-medium text-zinc-700">Posts page:</label>
              <select
                value={form.postsPageId ?? ""}
                onChange={(e) => set("postsPageId", e.target.value || null)}
                className="w-64 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              >
                <option value="">— Select a page —</option>
                {livePages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Posts per page ────────────────────────────────────────── */}
      <div className="border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Posts settings</h2>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="w-64 text-sm text-zinc-700">
              Number of recent posts shown on archive pages
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.postsPerPage}
              onChange={(e) => set("postsPerPage", Number(e.target.value) || 10)}
              className="h-9 w-20 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="w-64 text-sm text-zinc-700">
              Number of recent items shown in syndication feeds
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.feedsPerPage}
              onChange={(e) => set("feedsPerPage", Number(e.target.value) || 10)}
              className="h-9 w-20 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
        </div>
      </div>

      {/* ── Feed format ───────────────────────────────────────────── */}
      <div className="border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Feed content</h2>

        <div className="space-y-3">
          <p className="text-sm text-zinc-700">For each post in a feed, include</p>
          <div className="ml-0 space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="feedFormat"
                value="full"
                checked={form.feedFormat === "full"}
                onChange={() => set("feedFormat", "full")}
                className="h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-500"
              />
              <span className="text-sm text-zinc-700">Full text</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="feedFormat"
                value="excerpt"
                checked={form.feedFormat === "excerpt"}
                onChange={() => set("feedFormat", "excerpt")}
                className="h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-500"
              />
              <span className="text-sm text-zinc-700">Excerpt</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Search engine visibility ──────────────────────────────── */}
      <div className="rounded-b-lg border-x border-b border-zinc-200 bg-white px-6 py-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Search engine visibility</h2>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.searchEngineVisibility === "hidden"}
            onChange={(e) =>
              set("searchEngineVisibility", e.target.checked ? "hidden" : "visible")
            }
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
          />
          <div>
            <span className="text-sm text-zinc-700">
              Discourage search engines from indexing this site
            </span>
            <p className="mt-0.5 text-xs text-zinc-400">
              It is up to search engines to honor this request.
            </p>
          </div>
        </label>
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
