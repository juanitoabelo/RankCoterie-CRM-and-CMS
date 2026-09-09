/**
 * Geo Module — Database Queries
 * 
 * All database queries for geographic operations (regions, geo-images).
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import type { RegionWithDetails, GeoImageWithRelations, RegionFilter, GeoImageFilter, PaginatedGeo } from "./types";

const DEFAULT_PAGE_SIZE = 50;

// ============================================================================
// Regions
// ============================================================================

/** Fetch paginated regions */
export async function getRegions(filter: RegionFilter = {}): Promise<PaginatedGeo<RegionWithDetails>> {
  const { state, search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filter;
  const skip = (page - 1) * pageSize;
  
  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  if (state) where.state = state;
  if (search) {
    where.OR = [
      { state: { contains: search, mode: "insensitive" } },
      { stateFull: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }
  
  const [items, total] = await Promise.all([
    prisma.region.findMany({
      where,
      orderBy: [{ priority: "asc" }, { state: "asc" }, { city: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.region.count({ where }),
  ]);

  return { items: items as RegionWithDetails[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Fetch all regions (for dropdowns) */
export async function getAllRegions(): Promise<RegionWithDetails[]> {
  return prisma.region.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: [{ priority: "asc" }, { state: "asc" }],
  }) as Promise<RegionWithDetails[]>;
}

/** Fetch a single region by ID */
export async function getRegionById(id: string) {
  return prisma.region.findUnique({ where: { id } });
}

/** Fetch unique states */
export async function getStates(): Promise<string[]> {
  const regions = await prisma.region.findMany({
    where: { tenantId: TENANT_ID },
    select: { state: true },
    distinct: ["state"],
    orderBy: { state: "asc" },
  });
  return regions.map((r) => r.state);
}

// ============================================================================
// Geo Images
// ============================================================================

/** Fetch paginated geo images */
export async function getGeoImages(filter: GeoImageFilter = {}): Promise<PaginatedGeo<GeoImageWithRelations>> {
  const { categoryId, state, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filter;
  const skip = (page - 1) * pageSize;
  
  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  if (categoryId) where.categoryId = categoryId;
  if (state) where.region = { state };
  
  const [items, total] = await Promise.all([
      prisma.categoryImage.findMany({
      where,
      include: {
        category: { select: { id: true, title: true } },
        region: { select: { id: true, state: true, city: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.categoryImage.count({ where }),
  ]);

  return { items: items as GeoImageWithRelations[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Fetch a single geo image by ID */
export async function getGeoImageById(id: string) {
  return prisma.categoryImage.findUnique({
    where: { id },
    include: { category: true, region: true },
  });
}
