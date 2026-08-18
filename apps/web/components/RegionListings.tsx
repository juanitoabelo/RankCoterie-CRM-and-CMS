import Link from "next/link";
import { getCatalogRepo } from "@/lib/directory/catalog";
import { getListingPage } from "@/lib/directory/listingQuery";
import type { RegionContext } from "@/lib/localization/render";
import ListingCard from "@/components/ListingCard";

/**
 * Shared server component: candidate fetch → visibility gate → sort → paginate → render.
 * Used by both the region page and its `/page/N/` paginated variant (single enforcement point).
 */
export default async function RegionListings({
  categorySlug,
  regionSlug,
  categoryId,
  regionId,
  regionCtx,
  page = 1,
}: {
  categorySlug: string;
  regionSlug: string;
  categoryId: string;
  regionId: string | "ALL";
  regionCtx: RegionContext;
  page?: number;
}) {
  const repo = await getCatalogRepo();
  const result = await getListingPage(
    repo,
    { categoryId, regionId, page },
    { exclusions: await repo.getExclusions() },
  );

  if (result.listings.length === 0) {
    return (
      <p className="mt-4 text-zinc-500">
        No programs are currently listed for this area. Looking to get listed?{" "}
        <a href="/" className="underline underline-offset-2 hover:text-zinc-800">
          Apply here
        </a>
        .
      </p>
    );
  }

  return (
    <>
      <h2 className="mt-10 text-xl font-semibold text-zinc-900">
        Listings ({result.total})
      </h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {result.listings.map((l) => (
          <ListingCard key={l.id} listing={l} regionCtx={regionCtx} />
        ))}
      </div>

      {result.totalPages > 1 && (
        <nav className="mt-8 flex justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={n === 1 ? `/g/${categorySlug}/${regionSlug}/` : `/g/${categorySlug}/${regionSlug}/page/${n}/`}
              className={`rounded-md border px-3 py-1 text-sm ${
                n === result.page
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-700 hover:border-zinc-300"
              }`}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}