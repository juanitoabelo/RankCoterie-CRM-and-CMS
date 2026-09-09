/**
 * Listings Module — Database Queries
 * 
 * All database queries for listing operations.
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import type { ListingsFilter, PaginatedListings, ListingWithRelations } from "./types";

const DEFAULT_PAGE_SIZE = 50;

/** Fetch paginated listings with filters */
export async function getListings(filter: ListingsFilter = {}): Promise<PaginatedListings> {
  const { status = "ALL", page = 1, pageSize = DEFAULT_PAGE_SIZE } = filter;
  const skip = (page - 1) * pageSize;
  
  const where = status === "ALL" ? {} : { status };
  
  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: {
        categories: { include: { category: { select: { title: true } } } },
        subscription: { select: { stripeSubId: true, currentPeriodEnd: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    listings: listings as unknown as ListingWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/** Fetch a single listing by ID */
export async function getListingById(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      regions: true,
      subscription: true,
    },
  });
}

/** Count listings by status */
export async function countListingsByStatus() {
  return prisma.listing.groupBy({
    by: ["status"],
    where: { tenantId: TENANT_ID },
    _count: { _all: true },
  });
}
