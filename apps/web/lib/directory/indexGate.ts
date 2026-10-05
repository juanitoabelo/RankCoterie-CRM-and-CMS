/**
 * Canopy V2 — /g/* indexation gate: THE one rule.
 *
 *   "A URL is visible to Google only at the quality level it currently earns."
 *
 * A region page is indexable iff it has ≥1 VISIBLE listing OR authored region
 * content (region.custom1/custom2, or a matching CategoryRegionContent row).
 * Category-level fallbacks (stateInit/stateDesc/description) are shared
 * boilerplate with only the place name tokenized — they NEVER count.
 *
 * The same rule feeds every surface that previously disagreed:
 *   1. generateMetadata robots on region + pagination pages
 *   2. app/sitemap.ts URL submission
 *   3. the parent state index (link set === index set)
 *   4. city pills on state pages
 *
 * Counts always run through the visibility gate (visibility.ts) with the same
 * candidate query the pages use, so the gate can never say "empty" about a page
 * that renders listings (or vice versa). Results are cached per category for
 * 1h to match `revalidate = 3600` on /g/* — one pair of queries per category
 * instead of one per region.
 *
 * Excluded pages stay generated and browsable for humans; they simply leave the
 * index and the sitemap (Google's prescribed remedy for content that hasn't
 * earned indexing: "exclude it from Search").
 */

import type { CatalogRegion, CategoryRegionContent, CatalogRepo } from "./catalog";
import { filterVisibleListings } from "./visibility";
import { LISTINGS_PER_PAGE } from "./listingQuery";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — aligned with /g/* revalidate

const countsCache = new Map<string, { expires: number; value: Map<string, number> }>();
const contentCache = new Map<string, { expires: number; value: CategoryRegionContent[] }>();

/** Test hook — drop the per-category memoization. */
export function clearIndexGateCache(): void {
  countsCache.clear();
  contentCache.clear();
}

/* ------------------------------------------------------------------ Pure rule */

/**
 * True when the region has content an editor actually wrote FOR this region:
 * region.custom1/custom2, or a CategoryRegionContent row matching the same
 * state/area rules resolveContent.ts uses (states match areaPart "ALL", cities
 * match their own areaPart). Shared category fallbacks do not qualify.
 */
export function hasAuthoredRegionContent(
  region: CatalogRegion,
  contents: CategoryRegionContent[],
): boolean {
  if (region.custom1?.trim() || region.custom2?.trim()) return true;
  const isState = region.city === null;
  return contents.some(
    (c) =>
      c.state === region.state &&
      (isState ? c.areaPart === "ALL" : c.areaPart === region.areaPart),
  );
}

/** The gate itself: indexable iff visible listings OR authored content. */
export function isRegionIndexable(args: {
  hasAuthoredContent: boolean;
  visibleListingCount: number;
}): boolean {
  return args.visibleListingCount > 0 || args.hasAuthoredContent;
}

/**
 * Page N (N ≥ 2) is indexable only when the region is indexable AND the region
 * has listings spilling onto that page. Also guards the /page/2/ duplicate of
 * page 1 that paginate() clamps to when totalPages === 1.
 */
export function regionPageHasListings(
  visibleListingCount: number,
  pageNum: number,
  perPage: number = LISTINGS_PER_PAGE,
): boolean {
  const page = Number.isFinite(pageNum) ? Math.max(1, Math.trunc(pageNum)) : 1;
  return visibleListingCount > (page - 1) * perPage;
}

/* ------------------------------------------------------------------ Async resolution */

/** Visible listing counts for every region of a category (cached1h). */
export async function resolveRegionListingCounts(
  repo: CatalogRepo,
  categoryId: string,
): Promise<Map<string, number>> {
  const hit = countsCache.get(categoryId);
  if (hit && hit.expires > Date.now()) return hit.value;

  const [candidates, exclusions] = await Promise.all([
    repo.getCategoryListingCandidates(categoryId),
    repo.getExclusions(),
  ]);
  const visible = new Set(
    filterVisibleListings(
      candidates.map((c) => c.listing),
      { exclusions },
    ).map((l) => l.id),
  );

  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    if (!visible.has(candidate.listing.id)) continue;
    for (const regionId of candidate.regionIds) {
      counts.set(regionId, (counts.get(regionId) ?? 0) + 1);
    }
  }

  countsCache.set(categoryId, { expires: Date.now() + CACHE_TTL_MS, value: counts });
  return counts;
}

/** All CategoryRegionContent rows for a category (cached1h). */
async function resolveRegionContents(
  repo: CatalogRepo,
  categoryId: string,
): Promise<CategoryRegionContent[]> {
  const hit = contentCache.get(categoryId);
  if (hit && hit.expires > Date.now()) return hit.value;
  const rows = await repo.getCategoryRegionContent({ categoryId });
  contentCache.set(categoryId, { expires: Date.now() + CACHE_TTL_MS, value: rows });
  return rows;
}

/** Gate decision for a single region page (robots noindex input). */
export async function resolveRegionIndexable(
  repo: CatalogRepo,
  categoryId: string,
  region: CatalogRegion,
): Promise<boolean> {
  const [counts, contents] = await Promise.all([
    resolveRegionListingCounts(repo, categoryId),
    resolveRegionContents(repo, categoryId),
  ]);
  return isRegionIndexable({
    hasAuthoredContent: hasAuthoredRegionContent(region, contents),
    visibleListingCount: counts.get(region.id) ?? 0,
  });
}

/** Gate decision for /page/N/ — region gate AND listings spill onto page N. */
export async function resolveRegionPageIndexable(
  repo: CatalogRepo,
  categoryId: string,
  region: CatalogRegion,
  pageNum: number,
): Promise<boolean> {
  const [regionIndexable, counts] = await Promise.all([
    resolveRegionIndexable(repo, categoryId, region),
    resolveRegionListingCounts(repo, categoryId),
  ]);
  if (!regionIndexable) return false;
  return regionPageHasListings(counts.get(region.id) ?? 0, pageNum);
}

/**
 * Filter regions down to the indexable subset. Keeps input order (priority).
 * Used by the parent state index, city pills, and the sitemap — link set and
 * index set are the same set by construction.
 */
export async function filterIndexableRegions(
  repo: CatalogRepo,
  categoryId: string,
  regions: CatalogRegion[],
): Promise<CatalogRegion[]> {
  if (regions.length === 0) return [];
  const [counts, contents] = await Promise.all([
    resolveRegionListingCounts(repo, categoryId),
    resolveRegionContents(repo, categoryId),
  ]);
  return regions.filter((region) =>
    isRegionIndexable({
      hasAuthoredContent: hasAuthoredRegionContent(region, contents),
      visibleListingCount: counts.get(region.id) ?? 0,
    }),
  );
}
