/**
 * Canopy V2 — listing query composition for a category × region page.
 *
 * Single pipeline used by every `/g/` page tier:
 *   1. fetch candidates                 (CatalogRepo)
 *   2. enforce visibility               (visibility gate — suppression, paid tiers, exclusions)
 *   3. order by prominence              (PREMIUM → STANDARD → grace FREE → newest)
 *   4. paginate
 */

import type { CatalogListing, CatalogRepo } from "./catalog";
import { filterVisibleListings, type VisibilityOptions } from "./visibility";

export const LISTINGS_PER_PAGE = 10;

const TIER_RANK = { PREMIUM: 0, STANDARD: 1, FREE: 2, SUPPRESSED: 3 } as const;

export function sortVisibleListings<T extends CatalogListing>(listings: T[]): T[] {
  return [...listings].sort((a, b) => {
    const diff = TIER_RANK[a.tier] - TIER_RANK[b.tier];
    if (diff !== 0) return diff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export function paginate<T>(items: T[], page: number, perPage = LISTINGS_PER_PAGE): {
  items: T[];
  total: number;
  totalPages: number;
} {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    total,
    totalPages,
  };
}

export interface ListingPageResult {
  listings: CatalogListing[];
  visible: CatalogListing[];
  total: number;
  totalPages: number;
  page: number;
}

export async function getListingPage(
  repo: CatalogRepo,
  args: {
    categoryId: string;
    regionId: "ALL" | string;
    page?: number;
  },
  visibility: VisibilityOptions = {},
): Promise<ListingPageResult> {
  const candidates = await repo.getListingsByCategoryAndRegion(
    args.categoryId,
    args.regionId,
  );
  const visible = sortVisibleListings(filterVisibleListings(candidates, visibility));
  const { items, total, totalPages } = paginate(visible, args.page ?? 1);
  return { listings: items, visible, total, totalPages, page: args.page ?? 1 };
}