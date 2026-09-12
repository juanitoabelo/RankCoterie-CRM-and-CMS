"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGeoCategoryImage, type ActionResult } from "../../actions";
import ImageUploader from "@/components/admin/ImageUploader";

interface Option {
  id: string;
  title?: string;
  slug?: string;
  city?: string | null;
  state?: string;
}

export default function NewGeoCategoryImageForm({
  categories,
  regions,
}: {
  categories: Option[];
  regions: Option[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res = await createGeoCategoryImage(formData);
      setMessage(res);
      if (res.ok) router.push("/admin/geo-categories");
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/geo-categories" className="hover:text-zinc-700">GeoCategory Pages</a> /{" "}
        <span className="text-zinc-700">Add New Image</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Add New GeoCategory Image</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Upload an image and assign it to a specific geo category and region.
      </p>

      <form action={onSubmit} className="mt-8 space-y-6 rounded-xl border border-zinc-200 bg-white p-5">
        {message && (
          <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
            {message.ok ? "Image saved." : message.error}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-800">For Which GeoCategory? *</label>
          <select name="categoryId" required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800">For Which Region Page?</label>
          <select name="regionId" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="">All regions</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.city ? `${region.city}, ${region.state}` : region.slug}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800">Image Position *</label>
          <select name="position" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="PRIMARY">Parent / Primary Image</option>
            <option value="STATE">State Image</option>
            <option value="CITY">City Image</option>
            <option value="BANNER">Banner</option>
            <option value="THUMB">Thumbnail</option>
          </select>
        </div>

        <ImageUploader name="imageAssetId" label="Upload Image" />

        <p className="text-xs text-zinc-500">
          Free stock images (Creative Commons license) can be found from:{" "}
          <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Unsplash</a>,{" "}
          <a href="https://pixabay.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Pixabay</a>,{" "}
          <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Pexels</a>,{" "}
          <a href="https://www.lifeofpix.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Life of Pix</a>,{" "}
          <a href="https://www.foodiesfeed.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">FoodiesFeed</a>,{" "}
          <a href="https://stocksnap.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">StockSnap</a>
        </p>

        <div className="flex justify-end border-t border-zinc-100 pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
          >
            {isPending ? "Saving..." : "SAVE NEW IMAGE"}
          </button>
        </div>
      </form>
    </div>
  );
}
