"use client";

import { useState } from "react";

const labelCls = "block text-xs font-medium text-zinc-600";

export default function BuilderImageUploader({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className={labelCls}>{label}</span>
      {value && (
        <div className="relative">
          <img
            src={value}
            alt=""
            className="h-20 w-full rounded-lg border border-zinc-200 object-cover"
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
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        disabled={uploading}
        className="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white disabled:opacity-50"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {uploading && <p className="text-xs text-zinc-500">Uploading...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-[10px] text-zinc-400">Or enter URL:</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://... or /api/assets/..."
        className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs"
      />
    </div>
  );
}
