"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured First" },
  { value: "rating", label: "Highest Rated" },
  { value: "reviews", label: "Most Reviews" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "A-Z" },
] as const;

const TIER_OPTIONS = [
  { value: "", label: "All Tiers" },
  { value: "PREMIUM", label: "Premium" },
  { value: "STANDARD", label: "Standard" },
  { value: "FREE", label: "Free" },
] as const;

const RATING_OPTIONS = [
  { value: "", label: "All Ratings" },
  { value: "4", label: "4+ Stars" },
  { value: "3", label: "3+ Stars" },
] as const;

export default function RegionFilterBar({
  categorySlug,
  regionSlug,
  currentSort = "featured",
  currentTier = "",
  currentRating = "",
}: {
  categorySlug: string;
  regionSlug: string;
  currentSort: string;
  currentTier: string;
  currentRating: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.delete("page"); // Reset to page 1
    router.push(`/g/${categorySlug}/${regionSlug}/?${params.toString()}`);
  };

  return (
    <div className="mt-8 mb-4 flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">Sort:</label>
        <select
          value={currentSort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">Tier:</label>
        <select
          value={currentTier}
          onChange={(e) => updateParams({ tier: e.target.value || undefined })}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {TIER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">Rating:</label>
        <select
          value={currentRating}
          onChange={(e) => updateParams({ rating: e.target.value || undefined })}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {RATING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ml-auto flex items-center gap-2 text-sm text-zinc-500">
        <span className="flex items-center gap-1">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          <span>Filters</span>
        </span>
      </div>
    </div>
  );
}
