"use client";

import { useState } from "react";

type MediaAsset = { id: string; url: string; filename: string | null };

/**
 * Multi-image gallery editor for the product form. Images live in the media
 * library; this component only tracks asset ids in display order and posts
 * them as hidden `galleryAssetIds` inputs (featured image excluded).
 */
export default function ProductGalleryUploader({
  value,
  featuredAssetId,
  onChange,
  onMakeFeatured,
}: {
  value: string[];
  featuredAssetId: string | null;
  onChange: (ids: string[]) => void;
  onMakeFeatured: (assetId: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<MediaAsset[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const isUsed = (id: string) => id === featuredAssetId || value.includes(id);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const added: string[] = [];
      for (const file of list) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/uploads", { method: "POST", body: formData });
        const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
        const id = json.url.replace(/^\/api\/assets\//, "");
        if (!added.includes(id)) added.push(id);
      }
      onChange([...value, ...added.filter((id) => !isUsed(id))]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
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

  function addFromLibrary() {
    const fresh = selectedIds.filter((id) => !isUsed(id));
    if (fresh.length > 0) onChange([...value, ...fresh]);
    setLibraryOpen(false);
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  }

  const btnCls =
    "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className={`${btnCls} cursor-pointer`}>
          {uploading ? "Uploading..." : "Add images"}
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) void uploadFiles(files);
              e.target.value = "";
            }}
          />
        </label>
        <button type="button" className={btnCls} onClick={() => void openLibrary()}>
          Choose from library
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-xs text-zinc-500">
          No gallery images yet. Gallery images appear alongside the featured image on
          product pages.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {value.map((assetId, index) => (
            <li key={assetId} className="group relative">
              {
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/assets/${assetId}`}
                  alt=""
                  className="aspect-square w-full rounded-lg border border-zinc-200 bg-zinc-100 object-cover"
                />
              }
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 rounded-b-lg bg-black/55 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Move left"
                    disabled={index === 0}
                    className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] text-zinc-700 hover:bg-white disabled:opacity-40"
                    onClick={() => move(index, -1)}
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    aria-label="Move right"
                    disabled={index === value.length - 1}
                    className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] text-zinc-700 hover:bg-white disabled:opacity-40"
                    onClick={() => move(index, 1)}
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] text-zinc-700 hover:bg-white"
                    onClick={() => onMakeFeatured(assetId)}
                  >
                    ★
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Remove image"
                  className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] text-red-700 hover:bg-white"
                  onClick={() => onChange(value.filter((id) => id !== assetId))}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {value.map((assetId) => (
        <input key={assetId} type="hidden" name="galleryAssetIds" value={assetId} />
      ))}

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
                    const used = isUsed(asset.id);
                    const selected = selectedIds.includes(asset.id);
                    return (
                      <li key={asset.id}>
                        <button
                          type="button"
                          disabled={used}
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
                          {
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={asset.url}
                              alt={asset.filename ?? ""}
                              className="aspect-square w-full bg-zinc-100 object-cover"
                            />
                          }
                          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                            {used ? "In use" : selected ? "Selected" : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-3">
              <button type="button" className={btnCls} onClick={() => setLibraryOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedIds.length === 0}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                onClick={addFromLibrary}
              >
                Add {selectedIds.length > 0 ? `${selectedIds.length} ` : ""}selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
