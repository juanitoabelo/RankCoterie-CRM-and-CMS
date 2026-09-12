"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateGeoCategory, deleteGeoCategory, deleteGeoCategoryImageForm, type ActionResult } from "../../actions";
import RichTextarea from "@/components/admin/RichTextarea";
import ImageUploader from "@/components/admin/ImageUploader";

interface GeoCategoryImage {
  id: string;
  position: string;
  imageAssetId: string;
}

interface GeoCategory {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  stateInit?: string | null;
  stateDesc?: string | null;
  cityInit?: string | null;
  cityDesc?: string | null;
  images: GeoCategoryImage[];
}

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";

export default function EditGeoCategoryForm({ category }: { category: GeoCategory }) {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const parentImage = category.images.find((i) => i.position === "PRIMARY");
  const stateImage = category.images.find((i) => i.position === "STATE");
  const cityImage = category.images.find((i) => i.position === "CITY");

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res = await updateGeoCategory(category.id, formData);
      setMessage(res);
    });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this geo category?")) return;
    startTransition(async () => {
      await deleteGeoCategory(category.id);
      router.push("/admin/geo-categories");
    });
  }

  function handleImageDelete(imageId: string) {
    startTransition(async () => {
      await deleteGeoCategoryImageForm(imageId);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/geo-categories" className="hover:text-zinc-700">GeoCategory Pages</a> /{" "}
        <span className="text-zinc-700">{category.title}</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Edit GeoCategory</h1>

      <form action={onSubmit} className="mt-8 space-y-8">
        {message && (
          <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
            {message.ok ? "Saved." : message.error}
          </p>
        )}

        {/* Title & Slug */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-800">GeoCategory Title *</label>
            <input name="title" required defaultValue={category.title} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">Slug * (lowercase, hyphens)</label>
            <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={category.slug} className={inputCls} />
          </div>
        </div>

        {/* Parent Page Content */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Category Parent Page</h2>
          <RichTextarea name="description" label="Category Parent Content" value={category.description ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <ImageUploader
              name="parentImageAssetId"
              label="Parent Image"
              currentAssetId={parentImage?.imageAssetId}
            />
            {parentImage && (
              <div className="flex items-end">
                <button type="button" onClick={() => handleImageDelete(parentImage.id)} className="text-xs text-red-600 hover:underline">
                  Remove image
                </button>
              </div>
            )}
          </div>
        </div>

        {/* State Page */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">GeoCategory State Page</h2>
          <RichTextarea name="stateInit" label="State Page Content (Intro)" value={category.stateInit ?? ""} />
          <RichTextarea name="stateDesc" label="State Page Content (Static)" value={category.stateDesc ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <ImageUploader
              name="stateImageAssetId"
              label="State Image"
              currentAssetId={stateImage?.imageAssetId}
            />
            {stateImage && (
              <div className="flex items-end">
                <button type="button" onClick={() => handleImageDelete(stateImage.id)} className="text-xs text-red-600 hover:underline">
                  Remove image
                </button>
              </div>
            )}
          </div>
        </div>

        {/* City Page */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">GeoCategory City Page</h2>
          <RichTextarea name="cityInit" label="City Page Content (Intro)" value={category.cityInit ?? ""} />
          <RichTextarea name="cityDesc" label="City Page Content (Static)" value={category.cityDesc ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <ImageUploader
              name="cityImageAssetId"
              label="City Image"
              currentAssetId={cityImage?.imageAssetId}
            />
            {cityImage && (
              <div className="flex items-end">
                <button type="button" onClick={() => handleImageDelete(cityImage.id)} className="text-xs text-red-600 hover:underline">
                  Remove image
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Alternate Indexes */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Alternate Indexes for GeoCategory City Pages</h2>
          <p className="text-xs text-zinc-500">Add alt text for city page images for SEO purposes.</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
          >
            {isPending ? "Saving..." : "SAVE GEOCATEGORY"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
