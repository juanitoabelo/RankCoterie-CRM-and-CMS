/**
 * Exclusions Module — Database Queries
 * 
 * All database queries for exclusion operations.
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import type { ExclusionWithDetails, ExclusionFilter, PaginatedExclusions } from "./types";

const DEFAULT_PAGE_SIZE = 50;

/** Fetch paginated exclusions */
export async function getExclusions(filter: ExclusionFilter = {}): Promise<PaginatedExclusions> {
  const { isActive, search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filter;
  const skip = (page - 1) * pageSize;
  
  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  if (isActive !== undefined) where.isActive = isActive;
  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: "insensitive" } },
      { domainKey: { contains: search, mode: "insensitive" } },
    ];
  }
  
  const [items, total] = await Promise.all([
    prisma.excludedCompany.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.excludedCompany.count({ where }),
  ]);

  return { items: items as ExclusionWithDetails[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Fetch active exclusions for visibility checks */
export async function getActiveExclusions() {
  return prisma.excludedCompany.findMany({
    where: { tenantId: TENANT_ID, isActive: true },
  });
}

/** Fetch a single exclusion by ID */
export async function getExclusionById(id: string) {
  return prisma.excludedCompany.findUnique({ where: { id } });
}
