"use client";

import { useState } from "react";
import MediaLibraryPicker from "@/components/admin/page-builder/MediaLibraryPicker";

export default function GalleryImagesUploader({
  name,
  currentAssetIds = [],
  onChange,
}: {
  name: string;
  currentAssetIds?: string[];
  onChange?: (assetIds: string[], urls: string[]) => void;
}) {
  const [assetIds, setAssetIds] = useState<string[]>(currentAssetIds);
  const [previewUrls, setPreviewUrls] = useState<string[]>(
    currentAssetIds?.map((id) => `/api/assets/${id}`) ?? [],
  );

  function handleMediaChange(url: string) {
    if (url) {
      const id = url.replace(/^\/api\/assets\//, "");
      if (!assetIds.includes(id)) {
        setAssetIds((prev) => [...prev, id]);
        setPreviewUrls((prev) => [...prev, url]);
      }
    }
  }

  function removeImage(index: number) {
    const newIds = assetIds.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    setAssetIds(newIds);
    setPreviewUrls(newUrls);
  }

  function reorderImages(fromIndex: number, toIndex: number) {
    const newIds = [...assetIds];
    const newUrls = [...previewUrls];
    const [removedId] = newIds.splice(fromIndex, 1);
    const [removedUrl] = newUrls.splice(fromIndex, 1);
    newIds.splice(toIndex, 0, removedId);
    newUrls.splice(toIndex, 0, removedUrl);
    setAssetIds(newIds);
    setPreviewUrls(newUrls);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-600">
          {assetIds.length} image{assetIds.length !== 1 ? "s" : ""} selected
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-blue-600 hover:underline"
        >
          + Add Images
        </button>
      </div>

      {previewUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative group">
              <div className="relative aspect-[4/3] rounded-lg border border-zinc-200 overflow-hidden">
                <img
                  src={previewUrls[index]}
                  alt={`Gallery image ${index + 1}`}
                  className="h-32 w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="rounded bg-red-600 px-2 py-1 text-[10px] text-white hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => index > 0 && reorderImages(index, index - 1)}
                  disabled={index === 0}
                  className="p-1 rounded bg-white/90 text-zinc-600 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => index < previewUrls.length - 1 && reorderImages(index, index + 1)}
                  disabled={index === previewUrls.length - 1}
                  className="p-1 rounded bg-white/90 text-zinc-600 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7v18" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <MediaLibraryPicker
        value={""}
        onChange={(url) => {
          if (url) {
            // When an image is selected from the library, add it to the gallery
            const id = url.replace(/^\/api\/assets\//, "");
            if (!assetIds.includes(id)) {
              setAssetIds((prev) => [...prev, id]);
              setPreviewUrls((prev) => [...prev, url]);
            }
          }
        }}
        label="Add More Images from Gallery"
      />

      <input type="hidden" name={name} value={assetIds.join(",")} />
    </div>
  );
}