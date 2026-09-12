"use client";

import { useState } from "react";

export default function ImageUploader({
  name,
  label,
  currentAssetId,
  onUpload,
}: {
  name: string;
  label: string;
  currentAssetId?: string | null;
  onUpload?: (assetId: string, url: string) => void;
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

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-zinc-600">{label}</label>
      {previewUrl && (
        <img
          src={previewUrl}
          alt=""
          className="h-24 w-24 rounded-lg border border-zinc-200 object-cover"
        />
      )}
      <input type="hidden" name={name} value={assetId} />
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        disabled={uploading}
        className="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white disabled:opacity-50"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <p className="text-[11px] text-zinc-400">JPG, PNG, WebP, GIF, AVIF (max 8 MB)</p>
      {uploading && <p className="text-xs text-zinc-500">Uploading...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
