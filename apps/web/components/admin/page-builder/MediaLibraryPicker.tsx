"use client";

import { useState, useEffect, useCallback } from "react";

type MediaAsset = {
  id: string;
  url: string;
  filename: string | null;
  mimeType: string;
  size: number;
  createdAt: string;
};

export default function MediaLibraryPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 24;

  const fetchAssets = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets?limit=${pageSize}&offset=${pageNum * pageSize}`);
      const data = await res.json();
      setAssets((prev) => (append ? [...prev, ...data.assets] : data.assets));
      setTotal(data.total);
    } catch {
      setError("Failed to load media library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setPage(0);
      fetchAssets(0);
    }
  }, [open, fetchAssets]);

  async function handleUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
      onChange(json.url);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <>
      <div className="space-y-2">
        <span className="block text-xs font-medium text-zinc-600">{label}</span>

        {value && (
          <div className="relative">
            <img
              src={value}
              alt=""
              className="h-28 w-full rounded-lg border border-zinc-200 object-cover"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-1 top-1 rounded bg-zinc-900/70 px-1.5 py-0.5 text-[10px] text-white hover:bg-zinc-900"
            >
              Remove
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <svg className="mr-1 inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {value ? "Change" : "Choose Image"}
          </button>
          <label className="flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
            <svg className="mr-1 inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Upload
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
          </label>
        </div>

        {uploading && <p className="text-xs text-zinc-500">Uploading...</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* ── Media Library Drawer ────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative flex w-full max-w-lg flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">Media Library</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-zinc-400 hover:text-zinc-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Upload zone */}
            <div className="border-b border-zinc-200 px-4 py-3">
              <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-zinc-300 px-4 py-4 text-center hover:border-zinc-400 hover:bg-zinc-50">
                <svg className="mb-1 h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-xs font-medium text-zinc-600">
                  {uploading ? "Uploading..." : "Click to upload or drag and drop"}
                </span>
                <span className="text-[10px] text-zinc-400">JPG, PNG, WebP, GIF, AVIF (max 8 MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file);
                  }}
                />
              </label>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {assets.length === 0 && !loading ? (
                <div className="py-12 text-center text-xs text-zinc-400">No images yet. Upload one above.</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => { onChange(asset.url); setOpen(false); }}
                      className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
                        value === asset.url ? "border-zinc-900 ring-2 ring-zinc-900" : "border-zinc-200 hover:border-zinc-400"
                      }`}
                    >
                      <img
                        src={asset.url}
                        alt={asset.filename || ""}
                        className="aspect-square w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="truncate text-[9px] text-white">{asset.filename || "Untitled"}</p>
                        <p className="text-[9px] text-white/70">{formatSize(asset.size)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="py-6 text-center text-xs text-zinc-400">Loading...</div>
              )}

              {assets.length < total && !loading && (
                <button
                  type="button"
                  onClick={() => { const next = page + 1; setPage(next); fetchAssets(next, true); }}
                  className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Load More ({assets.length} of {total})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
