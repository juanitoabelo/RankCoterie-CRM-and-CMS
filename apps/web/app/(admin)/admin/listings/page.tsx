/**
 * Admin Listings Page
 * 
 * Uses the Listings module for all listing-related functionality.
 */
import Link from "next/link";
import { getListings, ListingFilters, ListingTable, Pagination, STATUS_FILTERS } from "@/modules/listings";

export const revalidate = 0;

export default async function ListingsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page: pageParam } = await searchParams;
  const filter = STATUS_FILTERS.includes(status as never) ? status : "ALL";
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { listings, total, totalPages } = await getListings({
    status: filter as "ALL" | "DRAFT" | "PENDING_REVIEW" | "LIVE" | "SUSPENDED" | "EXPIRED",
    page,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Admin / <span className="text-zinc-700">Listings</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Listings</h1>
        </div>
        <Link
          href="/admin/listings/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          New listing
        </Link>
      </div>

      <ListingFilters currentFilter={filter ?? "ALL"} />
      <ListingTable listings={listings} />
      
      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={total}
        baseUrl="/admin/listings"
        filter={filter}
      />
    </div>
  );
}
