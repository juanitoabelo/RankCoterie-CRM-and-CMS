/**
 * Listings Module — Filter Component
 * 
 * Status filter buttons for the listings admin page.
 */
import Link from "next/link";
import { STATUS_FILTERS } from "../types";

interface ListingFiltersProps {
  currentFilter: string;
}

export function ListingFilters({ currentFilter }: ListingFiltersProps) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {STATUS_FILTERS.map((s) => (
        <Link
          key={s}
          href={s === "ALL" ? "/admin/listings" : `/admin/listings?status=${s}`}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            currentFilter === s
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 text-zinc-600 hover:border-zinc-300"
          }`}
        >
          {s === "PENDING_REVIEW" ? "Review queue" : s}
        </Link>
      ))}
    </div>
  );
}
