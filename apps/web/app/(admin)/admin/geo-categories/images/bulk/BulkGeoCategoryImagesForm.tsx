"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkCreateGeoCategoryImages, type ActionResult } from "../../actions";
import ImageUploader from "@/components/admin/ImageUploader";

interface Option {
  id: string;
  title?: string;
}

const STATE_ROWS = 20;
const CITY_ROWS = 20;

export default function BulkGeoCategoryImagesForm({
  categories,
}: {
  categories: Option[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [rowCount] = useState(STATE_ROWS + CITY_ROWS);

  function onSubmit(formData: FormData) {
    formData.set("rowCount", String(rowCount));
    setMessage(null);
    startTransition(async () => {
      const res = await bulkCreateGeoCategoryImages(formData);
      setMessage(res);
      if (res.ok) router.push("/admin/geo-categories");
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/geo-categories" className="hover:text-zinc-700">GeoCategory Pages</a> /{" "}
        <span className="text-zinc-700">Bulk Add Images</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Add Images in Bulk</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Assign multiple images at once to a geo category. Upload an image for each row, then fill in the title and alt text.
      </p>

      <p className="mt-3 text-xs text-zinc-500">
        Free stock images (Creative Commons license) can be found from:{" "}
        <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Unsplash</a>,{" "}
        <a href="https://pixabay.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Pixabay</a>,{" "}
        <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Pexels</a>,{" "}
        <a href="https://www.lifeofpix.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Life of Pix</a>,{" "}
        <a href="https://www.foodiesfeed.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">FoodiesFeed</a>,{" "}
        <a href="https://stocksnap.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">StockSnap</a>
      </p>

      <form action={onSubmit} className="mt-8 space-y-8">
        {message && (
          <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
            {message.ok ? "Bulk images processed." : message.error}
          </p>
        )}

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <label className="block text-sm font-medium text-zinc-800">For Which GeoCategory Page? *</label>
          <select name="categoryId" required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.title}</option>
            ))}
          </select>
        </div>

        {/* State Pages Section */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Images for GeoCategory State Pages</h2>
          <div className="space-y-3">
            {Array.from({ length: STATE_ROWS }).map((_, i) => (
              <ImageRow key={`state-${i}`} index={i} position="STATE" />
            ))}
          </div>
        </div>

        {/* City Pages Section */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Images for GeoCategory City Pages</h2>
          <div className="space-y-3">
            {Array.from({ length: CITY_ROWS }).map((_, i) => (
              <ImageRow key={`city-${i}`} index={STATE_ROWS + i} position="CITY" />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
        >
          {isPending ? "Processing..." : "PROCESS BULK IMAGES"}
        </button>
      </form>
    </div>
  );
}

function ImageRow({ index, position }: { index: number; position: string }) {
  return (
    <div className="grid grid-cols-12 gap-3 items-start">
      <input type="hidden" name={`position_${index}`} value={position} />
      <div className="col-span-4">
        <ImageUploader name={`imageAssetId_${index}`} label={`Image ${index + 1}`} />
      </div>
      <div className="col-span-4">
        <label className="block text-xs font-medium text-zinc-600">Title / Meta Description</label>
        <input
          name={`titleAlt_${index}`}
          placeholder="Title or meta description"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="col-span-4">
        <label className="block text-xs font-medium text-zinc-600">Alt Text</label>
        <input
          name={`altText_${index}`}
          placeholder="Alt text for SEO"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
