import Link from "next/link";
import { getCatalogRepo } from "@/lib/directory/catalog";
import { getListingPage } from "@/lib/directory/listingQuery";
import type { RegionContext } from "@/lib/localization/render";
import type { CatalogListing } from "@/lib/directory/catalog";
import { SITE_URL, itemListJsonLd, jsonLdHtml } from "@/lib/seo/geoCategorySeo";
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
  sort = "featured",
  tierFilter,
  ratingFilter,
}: {
  categorySlug: string;
  regionSlug: string;
  categoryId: string;
  regionId: string | "ALL";
  regionCtx: RegionContext;
  page?: number;
  sort?: string;
  tierFilter?: string;
  ratingFilter?: string;
}) {
  const repo = await getCatalogRepo();
  const result = await getListingPage(
    repo,
    { categoryId, regionId, page },
    { exclusions: await repo.getExclusions() },
  );

  // Apply additional filters and sorting
  let listings = result.listings as unknown as CatalogListing[];

  // Tier filter
  if (tierFilter) {
    listings = listings.filter((l) => l.tier === tierFilter);
  }

  // Rating filter (simplified - would need review data)
  if (ratingFilter) {
    // This would need to join with reviews table
    // For now, we'll skip as it requires additional query
  }

  // Custom sorting
  switch (sort) {
    case "rating":
      // Would need review data
      break;
    case "reviews":
      // Would need review data
      break;
    case "newest":
      listings = [...listings].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
    case "name":
      listings = [...listings].sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "featured":
    default:
      // Default is already sorted by tier prominence
      break;
  }

  if (listings.length === 0) {
    return (
      <p className="mt-4 text-zinc-500">
        No programs match your filters.{" "}
        <a href={`/g/${categorySlug}/${regionSlug}/`} className="underline underline-offset-2 hover:text-zinc-800">
          Clear filters
        </a>
        .
      </p>
    );
  }

  // Structured data for the visible inventory — mirrors exactly what renders
  // below (Google requires JSON-LD to reflect page content).
  const listingList = itemListJsonLd(
    `Programs in ${regionCtx.regionName ?? regionSlug}`,
    `Directory listings for ${categorySlug.replace(/-/g, " ")} in ${regionCtx.regionName ?? regionSlug}`,
    listings.map((l) => ({ name: l.title, url: `${SITE_URL}/listing/${l.slug}/` })),
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(listingList) }} />
      <h2 className="mt-10 text-xl font-semibold text-zinc-900">
        Listings ({listings.length} of {result.total})
      </h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {listings.map((l) => (
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