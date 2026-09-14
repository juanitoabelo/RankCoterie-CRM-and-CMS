"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type MediaAsset = {
  id: string;
  url: string;
  filename: string | null;
  title: string | null;
  mimeType: string;
  size: number;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Edit modal state
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editResolution, setEditResolution] = useState("full");
  const [editWidth, setEditWidth] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const pageSize = 24;

  const fetchAssets = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/assets?limit=${pageSize}&offset=${pageNum * pageSize}`,
        );
        const data = await res.json();
        setAssets((prev) =>
          append ? [...prev, ...data.assets] : data.assets,
        );
        setTotal(data.total);
      } catch {
        setError("Failed to load media library.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchAssets(0);
  }, [fetchAssets]);

  async function handleUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
      setPage(0);
      await fetchAssets(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this image?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      setAssets((prev) => prev.filter((a) => a.id !== id));
      setTotal((prev) => prev - 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(null);
    }
  }

  function openEdit(asset: MediaAsset) {
    setEditing(asset);
    setEditTitle(asset.title ?? "");
    setEditAlt(asset.alt ?? "");
    setEditCaption(asset.caption ?? "");

    // Determine resolution preset from existing dimensions
    const w = asset.width;
    const h = asset.height;
    if (!w && !h) {
      setEditResolution("full");
    } else {
      const match = RESOLUTION_PRESETS.find(
        (p) => p.w === w && p.h === h,
      );
      setEditResolution(match ? match.value : "custom");
    }
    setEditWidth(w?.toString() ?? "");
    setEditHeight(h?.toString() ?? "");
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

      const updated = await res.json();
      setAssets((prev) =>
        prev.map((a) =>
          a.id === editing.id
            ? { ...a, title: updated.title, alt: updated.alt, caption: updated.caption, width: updated.width, height: updated.height }
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) void handleUpload(file);
  }

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Media Library</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Media Library
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Upload and manage images for use across your site. Add alt text and
        captions for better SEO.
      </p>

      {/* Upload zone */}
      <div
        className={`mt-6 rounded-xl border-2 border-dashed transition-colors ${
          dragOver
            ? "border-zinc-900 bg-zinc-100"
            : "border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <label className="flex cursor-pointer flex-col items-center px-6 py-10">
          <svg
            className="mb-2 h-10 w-10 text-zinc-400"
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
          <span className="text-sm font-medium text-zinc-700">
            {uploading ? "Uploading..." : "Click to upload or drag and drop"}
          </span>
          <span className="mt-1 text-xs text-zinc-400">
            JPG, PNG, WebP, GIF, AVIF (max 8 MB)
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* Stats */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {total} {total === 1 ? "image" : "images"}
        </p>
      </div>

      {/* Grid */}
      {assets.length === 0 && !loading ? (
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white py-16 text-center">
          <svg
            className="mx-auto h-12 w-12 text-zinc-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
          <p className="mt-3 text-sm text-zinc-500">No images yet.</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Upload your first image
          </button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md"
            >
              <div className="aspect-square overflow-hidden bg-zinc-100">
                <img
                  src={asset.url}
                  alt={asset.alt || asset.filename || ""}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <div className="px-3 pb-3">
                  <p className="truncate text-xs font-medium text-white">
                    {asset.filename || "Untitled"}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-white/70">
                    <span>{formatSize(asset.size)}</span>
                    {asset.width && asset.height && (
                      <>
                        <span>·</span>
                        <span>
                          {asset.width}×{asset.height}
                        </span>
                      </>
                    )}
                  </div>
                  {asset.alt && (
                    <p className="mt-0.5 truncate text-[10px] text-white/50 italic">
                      &quot;{asset.alt}&quot;
                    </p>
                  )}
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(asset)}
                      className="rounded bg-white/20 px-2 py-1 text-[10px] font-medium text-white hover:bg-white/30"
                    >
                      Edit
                    </button>
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded bg-white/20 px-2 py-1 text-[10px] font-medium text-white hover:bg-white/30"
                    >
                      View
                    </a>
                    <button
                      type="button"
                      disabled={deleting === asset.id}
                      onClick={() => void handleDelete(asset.id)}
                      className="rounded bg-red-500/80 px-2 py-1 text-[10px] font-medium text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      {deleting === asset.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="mt-6 py-6 text-center text-sm text-zinc-400">
          Loading...
        </div>
      )}

      {assets.length < total && !loading && (
        <button
          type="button"
          onClick={() => {
            const next = page + 1;
            setPage(next);
            fetchAssets(next, true);
          }}
          className="mt-6 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Load More ({assets.length} of {total})
        </button>
      )}

      {/* ── Edit Drawer ──────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditing(null)}
          />
          <div className="relative flex w-full max-w-md flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-900">
                Edit Image Details
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded p-1 text-zinc-400 hover:text-zinc-600"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Preview */}
            <div className="border-b border-zinc-200 bg-zinc-50 p-4">
              <img
                src={editing.url}
                alt={editAlt || editing.filename || ""}
                className="mx-auto max-h-48 rounded-lg object-contain"
              />
              <p className="mt-2 text-center text-xs text-zinc-500">
                {editing.filename}
              </p>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Title
                  </label>
                  <p className="mb-1.5 text-[11px] text-zinc-400">
                    Internal name for organizing your media.
                  </p>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. Hero banner for homepage"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  />
                </div>

                {/* Alt Text */}
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Alt Text
                  </label>
                  <p className="mb-1.5 text-[11px] text-zinc-400">
                    Describes the image for screen readers and search engines.
                  </p>
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
                  <label className="block text-xs font-medium text-zinc-700">
                    Caption
                  </label>
                  <p className="mb-1.5 text-[11px] text-zinc-400">
                    Optional caption displayed below the image on the site.
                  </p>
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
                  <label className="block text-xs font-medium text-zinc-700">
                    Image Resolution
                  </label>
                  <p className="mb-1.5 text-[11px] text-zinc-400">
                    Select a preset size or choose Custom to set dimensions manually.
                  </p>
                  <select
                    value={editResolution}
                    onChange={(e) => setEditResolution(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  >
                    {RESOLUTION_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}{p.w ? ` – ${p.w} x ${p.h || "auto"}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Dimensions */}
                {editResolution === "custom" && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-700">
                      Custom Dimensions
                    </label>
                    <p className="mb-1.5 text-[11px] text-zinc-400">
                      Width and height in pixels.
                    </p>
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

                {/* Read-only info */}
                <div className="rounded-lg bg-zinc-50 p-3">
                  <h3 className="text-xs font-medium text-zinc-700">
                    File Info
                  </h3>
                  <dl className="mt-2 space-y-1 text-xs text-zinc-500">
                    <div className="flex justify-between">
                      <dt>Size</dt>
                      <dd>{formatSize(editing.size)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Type</dt>
                      <dd>{editing.mimeType}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Uploaded</dt>
                      <dd>{formatDate(editing.createdAt)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {saveError && (
                <p className="mt-3 text-sm text-red-600">{saveError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-200 px-5 py-4">
              <div className="flex gap-3">
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
    </div>
  );
}
