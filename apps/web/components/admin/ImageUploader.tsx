"use client";

import { useState } from "react";
import MediaLibraryPicker from "@/components/admin/page-builder/MediaLibraryPicker";

export default function ImageUploader({
  name,
  label,
  currentAssetId,
  onUpload,
  hint,
}: {
  name: string;
  label: string;
  currentAssetId?: string | null;
  onUpload?: (assetId: string, url: string) => void;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(
    currentAssetId ? `/api/assets/${currentAssetId}` : "",
  );
  const [assetId, setAssetId] = useState<string>(currentAssetId ?? "");

  async function handleFile(file: File) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
      const id = json.url.replace(/^\/api\/assets\//, "");
      setPreviewUrl(json.url);
      setAssetId(id);
      onUpload?.(id, json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleMediaChange(url: string) {
    let nextAssetId = "";
    if (url) {
      nextAssetId = url.replace(/^\/api\/assets\//, "");
      setPreviewUrl(url);
      setAssetId(nextAssetId);
    } else {
      setPreviewUrl("");
      setAssetId("");
    }
    onUpload?.(nextAssetId, url);
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-zinc-600">{label}</label>
      {hint && <p className="-mt-1 text-[11px] text-amber-700">{hint}</p>}
      {previewUrl && (
        <div className="relative">
          <img
            src={previewUrl}
            alt=""
            className="h-24 w-24 rounded-lg border border-zinc-200 object-cover"
          />
          <button
            type="button"
            onClick={() => {
              setPreviewUrl("");
              setAssetId("");
              handleMediaChange("");
            }}
            className="absolute right-1 top-1 rounded bg-zinc-900/70 px-1.5 py-0.5 text-[10px] text-white hover:bg-zinc-900"
          >
            Remove
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <MediaLibraryPicker
          value={previewUrl}
          onChange={handleMediaChange}
          label={previewUrl ? "Change from Gallery" : "Choose From Gallery"}
        />
      </div>

      <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
        {uploading ? "Uploading..." : "Upload from device"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          disabled={uploading}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
      </label>

      <input type="hidden" name={name} value={assetId} />
      <p className="text-[11px] text-zinc-400">JPG, PNG, WebP, GIF, AVIF (max 8 MB)</p>
      {uploading && <p className="text-xs text-zinc-500">Uploading...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
