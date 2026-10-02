"use client";

import { useState } from "react";
import type { ActionResult } from "@/app/(admin)/admin/products/actions";

type MediaAsset = { id: string; url: string; filename: string | null };

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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryAssets, setLibraryAssets] = useState<MediaAsset[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  async function openLibrary() {
    setLibraryOpen(true);
    setSelectedIds([]);
    setLibraryError(null);
    setLibraryLoading(true);
    try {
      const res = await fetch("/api/assets?limit=100");
      const json = (await res.json().catch(() => ({}))) as { assets?: MediaAsset[]; error?: string };
      if (!res.ok || !json.assets) throw new Error(json.error ?? "Failed to load media library.");
      setLibraryAssets(json.assets);
    } catch (e) {
      setLibraryError(e instanceof Error ? e.message : "Failed to load media library.");
    } finally {
      setLibraryLoading(false);
    }
  }

  return (
    <>
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
        <button type="button" className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50" onClick={() => openLibrary()}>
          Choose from library
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>

    {libraryOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">Media library</h3>
        <button
          type="button"
          className="text-zinc-400 hover:text-zinc-700"
          aria-label="Close"
          onClick={() => setLibraryOpen(false)}
        >
          ✕
        </button>
      </div>
      <div className="min-h-40 flex-1 overflow-y-auto p-5">
        {libraryLoading && <p className="text-sm text-zinc-500">Loading images...</p>}
        {!libraryLoading && libraryError && (
          <p className="text-sm text-red-600">{libraryError}</p>
        )}
        {!libraryLoading && !libraryError && libraryAssets.length === 0 && (
          <p className="text-sm text-zinc-500">The media library is empty.</p>
        )}
        {!libraryLoading && !libraryError && libraryAssets.length > 0 && (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {libraryAssets.map((asset) => {
              const selected = selectedIds.includes(asset.id);
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    disabled={selected}
                    className={`relative block w-full overflow-hidden rounded-lg border-2 text-left disabled:opacity-50 ${
                      selected ? "border-zinc-900" : "border-transparent hover:border-zinc-300"
                    }`}
                    onClick={() =>
                      setSelectedIds((prev) =>
                        prev.includes(asset.id)
                          ? prev.filter((id) => id !== asset.id)
                          : [...prev, asset.id],
                      )
                    }
                  >
                    <img
                      src={asset.url}
                      alt={asset.filename ?? ""}
                      className="aspect-square w-full bg-zinc-100 object-cover"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                      {selected ? "Selected" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-3">
        <button type="button" className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50" onClick={() => setLibraryOpen(false)}>
          Cancel
        </button>
        <button
          type="button"
          disabled={selectedIds.length === 0}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          onClick={() => {
            if (selectedIds.length > 0) {
              void setImageAction(id, selectedIds[0]);
            }
            setLibraryOpen(false);
          }}
        >
          Add {selectedIds.length > 0 ? `${selectedIds.length} ` : ""}selected
        </button>
      </div>
    </div>
  </div>
)}
    </>
  );
}
