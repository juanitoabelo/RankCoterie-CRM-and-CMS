"use client";

import { useState } from "react";
import type { ActionResult } from "@/app/(admin)/admin/products/actions";

/**
 * Table cell that lets merchants set the image representing a category:
 * upload a new file (or pick an existing one implicitly by uploading), or
 * remove the current image. Calls the `setProductCategoryImage` server action.
 */
export default function CategoryImageCell({
  id,
  imageAssetId,
  setImageAction,
}: {
  id: string;
  imageAssetId: string | null;
  setImageAction: (id: string, assetId: string | null) => Promise<ActionResult>;
}) {
  const [assetId, setAssetId] = useState<string | null>(imageAssetId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
      const newAssetId = json.url.replace(/^\/api\/assets\//, "");
      const result = await setImageAction(id, newAssetId);
      if (!result.ok) throw new Error(result.error);
      setAssetId(newAssetId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const result = await setImageAction(id, null);
      if (!result.ok) throw new Error(result.error);
      setAssetId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        {assetId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/assets/${assetId}`}
            alt=""
            className="h-9 w-9 rounded-md border border-zinc-200 bg-zinc-100 object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-zinc-300 text-[10px] text-zinc-400">
            none
          </span>
        )}
        <label className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
          {busy ? "..." : assetId ? "Replace" : "Add"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </label>
        {assetId && (
          <button
            type="button"
            aria-label="Remove category image"
            disabled={busy}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
            onClick={() => void remove()}
          >
            ✕
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
