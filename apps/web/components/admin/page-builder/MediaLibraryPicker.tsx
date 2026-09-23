"use client";

import { useState, useEffect, useCallback } from "react";

type MediaAsset = {
  id: string;
  url: string;
  filename: string | null;
  mimeType: string;
  size: number;
  alt: string | null;
  title: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
};

const RESOLUTION_PRESETS = [
  { value: "thumbnail", label: "Thumbnail", w: 150, h: 150 },
  { value: "medium", label: "Medium", w: 300, h: 300 },
  { value: "medium_large", label: "Medium Large", w: 768, h: 0 },
  { value: "large", label: "Large", w: 1024, h: 1024 },
  { value: "1536", label: "1536x1536", w: 1536, h: 1536 },
  { value: "2048", label: "2048x2048", w: 2048, h: 2048 },
  { value: "full", label: "Full", w: null, h: null },
  { value: "custom", label: "Custom", w: null, h: null },
];

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 24;

  // Edit state
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editResolution, setEditResolution] = useState("full");
  const [editWidth, setEditWidth] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      void fetchAssets(0);
    }
  }, [open, fetchAssets]);

  function handleUpload(file: File): Promise<void> {
    return new Promise((resolve) => {
      setError(null);
      setUploading(true);
      setUploadProgress(0);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/uploads");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          try {
            const json = (JSON.parse(xhr.responseText) ?? {}) as { url?: string; error?: string };
            if (xhr.status < 200 || xhr.status >= 300 || !json.url) {
              throw new Error(json.error ?? "Upload failed.");
            }
            onChange(json.url);
            setOpen(false);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed.");
          } finally {
            setUploading(false);
            resolve();
          }
        };
        xhr.onerror = () => {
          setError("Upload failed. Network error.");
          setUploading(false);
          resolve();
        };
        xhr.send(formData);
      } catch {
        setError("Upload failed.");
        setUploading(false);
        resolve();
      }
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) void handleUpload(file);
  }

  function openEdit(asset: MediaAsset) {
    setEditing(asset);
    setEditTitle(asset.title ?? "");
    setEditAlt(asset.alt ?? "");
    setEditCaption(asset.caption ?? "");
    if (!asset.width && !asset.height) {
      setEditResolution("full");
    } else {
      const match = RESOLUTION_PRESETS.find((p) => p.w === asset.width && p.h === asset.height);
      setEditResolution(match ? match.value : "custom");
    }
    setEditWidth(asset.width?.toString() ?? "");
    setEditHeight(asset.height?.toString() ?? "");
    setSaveError(null);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      const preset = RESOLUTION_PRESETS.find((p) => p.value === editResolution);
      let width: number | null = null;
      let height: number | null = null;
      if (editResolution === "custom") {
        width = parseInt(editWidth, 10) || null;
        height = parseInt(editHeight, 10) || null;
      } else if (preset) {
        width = preset.w;
        height = preset.h;
      }
      const body: Record<string, unknown> = {
        title: editTitle || null,
        alt: editAlt || null,
        caption: editCaption || null,
        width,
        height,
      };
      const res = await fetch(`/api/assets/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed.");
      const updated = (await res.json().catch(() => ({}))) as {
        title?: string | null;
        alt?: string | null;
        caption?: string | null;
        width?: number | null;
        height?: number | null;
      };
      setAssets((prev) =>
        prev.map((a) =>
          a.id === editing.id
            ? { ...a, title: updated.title ?? a.title, alt: updated.alt ?? a.alt, caption: updated.caption ?? a.caption, width: updated.width ?? a.width, height: updated.height ?? a.height }
            : a,
        ),
      );
      setEditing(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
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
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              <label
                className={`flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-4 py-4 text-center ${
                  dragOver
                    ? "border-zinc-900 bg-zinc-100"
                    : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <svg className="mb-1 h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {uploading ? (
                  <span className="text-xs font-medium text-zinc-600">Uploading... {uploadProgress}%</span>
                ) : (
                  <span className="text-xs font-medium text-zinc-600">Click to upload or drag and drop</span>
                )}
                {uploading && (
                  <div className="mt-2 w-40 max-w-full overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className="h-1.5 rounded-full bg-zinc-900 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                <span className="mt-1 text-[10px] text-zinc-400">JPG, PNG, WebP, GIF, AVIF (max 8 MB)</span>
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

            {error && <p className="px-4 pb-2 text-xs text-red-600">{error}</p>}

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="py-8 text-center text-xs text-zinc-400">Loading...</div>
              ) : assets.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">No images yet. Upload one above.</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {assets.map((asset) => (
                    <div key={asset.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => openEdit(asset)}
                        className="absolute right-1 top-1 z-10 hidden rounded bg-zinc-900/70 px-1.5 py-0.5 text-[9px] font-medium text-white hover:bg-zinc-900 group-hover:block"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => { onChange(asset.url); setOpen(false); }}
                        className={`w-full overflow-hidden rounded-lg border-2 transition-all ${
                          value === asset.url ? "border-zinc-900 ring-2 ring-zinc-900" : "border-zinc-200 hover:border-zinc-400"
                        }`}
                      >
                        <img src={asset.url} alt={asset.filename || ""} className="aspect-square w-full object-cover" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {assets.length < total && !loading && (
                <button
                  type="button"
                  onClick={() => { const next = page + 1; setPage(next); void fetchAssets(next, true); }}
                  className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Load More ({assets.length} of {total})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Image Details Drawer ────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative flex w-full max-w-lg flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">Edit Image Details</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded p-1 text-zinc-400 hover:text-zinc-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Preview + File info */}
            <div className="border-b border-zinc-200 p-4">
              <img
                src={editing.url}
                alt={editAlt || editing.filename || ""}
                className="mx-auto max-h-44 rounded-lg border border-zinc-200 object-contain"
              />
              <p className="mt-2 text-center text-xs text-zinc-500">{editing.filename || "Untitled"}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                <div>Size: <span className="text-zinc-700">{formatSize(editing.size)}</span></div>
                <div>Type: <span className="text-zinc-700">{editing.mimeType}</span></div>
              </div>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto space-y-4 p-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-zinc-700">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Hero banner for homepage"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              {/* Alt Text */}
              <div>
                <label className="block text-xs font-medium text-zinc-700">Alt Text</label>
                <p className="mb-1 text-[11px] text-zinc-400">Describes the image for screen readers and search engines.</p>
                <input
                  type="text"
                  value={editAlt}
                  onChange={(e) => setEditAlt(e.target.value)}
                  placeholder="e.g. Blue running shoes on white background"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-medium text-zinc-700">Caption</label>
                <p className="mb-1 text-[11px] text-zinc-400">Optional caption displayed below the image on the site.</p>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="e.g. Product photo for summer collection 2024"
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              {/* Image Resolution */}
              <div>
                <label className="block text-xs font-medium text-zinc-700">Image Resolution</label>
                <p className="mb-1 text-[11px] text-zinc-400">Select a preset size or choose Custom to set dimensions manually.</p>
                <select
                  value={editResolution}
                  onChange={(e) => setEditResolution(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                >
                  {RESOLUTION_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}{p.w ? ` – ${p.w} x ${p.h || "auto"}` : ""}</option>
                  ))}
                </select>
              </div>

              {/* Custom Dimensions */}
              {editResolution === "custom" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700">Custom Dimensions</label>
                  <p className="mb-1 text-[11px] text-zinc-400">Width and height in pixels.</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={editWidth}
                        onChange={(e) => setEditWidth(e.target.value)}
                        placeholder="Width"
                        min={0}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                      />
                    </div>
                    <span className="text-zinc-400">×</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={editHeight}
                        onChange={(e) => setEditHeight(e.target.value)}
                        placeholder="Height"
                        min={0}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-200 px-4 py-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
