"use client";

import { useState, useTransition } from "react";
import { createCategoryImagesBulk, type ActionResult } from "./actions";

type Option = { id: string; label: string };

export default function BulkGeoImageForm({ categories, regions }: { categories: Option[]; regions: Option[] }) {
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setMessage(null);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        setMessage({ ok: false, error: result.error ?? "Upload failed." });
        return;
      }
      uploaded.push(result.url.replace(/^\/api\/assets\//, ""));
    }
    setAssetIds((current) => [...current, ...uploaded]);
  }

  function submit(formData: FormData) {
    assetIds.forEach((id) => formData.append("imageAssetIds", id));
    startTransition(async () => {
      const result = await createCategoryImagesBulk(formData);
      setMessage(result);
      if (result.ok) setAssetIds([]);
    });
  }

  return (
    <form action={submit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-medium text-zinc-900">Bulk upload and assign</h2>
      <label className="block text-xs font-medium text-zinc-600">Images
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml" multiple onChange={(event) => void upload(event.target.files)} className="mt-1 block w-full text-sm" />
      </label>
      {assetIds.length > 0 && <p className="text-xs text-zinc-500">{assetIds.length} image(s) uploaded and ready.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-zinc-600">Category<select name="categoryId" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"><option value="">All categories</option>{categories.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        <label className="block text-xs font-medium text-zinc-600">Region<select name="regionId" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"><option value="">All regions</option>{regions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
      </div>
      <label className="block text-xs font-medium text-zinc-600">Position<select name="position" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"><option>PRIMARY</option><option>BANNER</option><option>THUMB</option></select></label>
      {message && <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.ok ? "Images assigned." : message.error}</p>}
      <button type="submit" disabled={pending || assetIds.length === 0} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{pending ? "Assigning..." : "Assign uploaded images"}</button>
    </form>
  );
}
