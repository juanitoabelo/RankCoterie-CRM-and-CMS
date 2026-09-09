/**
 * Feeds Module — Database Queries
 * 
 * All database queries for feed operations.
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import type { FeedWithDetails, FeedFilter, PaginatedFeeds } from "./types";

const DEFAULT_PAGE_SIZE = 50;

/** Fetch paginated feeds */
export async function getFeeds(filter: FeedFilter = {}): Promise<PaginatedFeeds> {
  const { status = "ALL", search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filter;
  const skip = (page - 1) * pageSize;
  
  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  if (status !== "ALL") where.status = status;
  if (search) where.name = { contains: search, mode: "insensitive" };
  
  const [items, total] = await Promise.all([
    prisma.feed.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.feed.count({ where }),
  ]);

  return { items: items as FeedWithDetails[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Fetch a single feed by ID */
export async function getFeedById(id: string) {
  return prisma.feed.findUnique({ where: { id } });
}
