/**
 * Leads Module — Database Queries
 * 
 * All database queries for lead operations.
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import type { LeadWithRelations, LeadFilter, PaginatedLeads } from "./types";

const DEFAULT_PAGE_SIZE = 50;

/** Fetch paginated leads */
export async function getLeads(filter: LeadFilter = {}): Promise<PaginatedLeads> {
  const { status = "ALL", search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filter;
  const skip = (page - 1) * pageSize;
  
  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  if (status !== "ALL") where.status = status;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  
  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { notes: true, todos: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  return { items: items as LeadWithRelations[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Fetch lead stats by status */
export async function getLeadStats() {
  return prisma.lead.groupBy({
    by: ["status"],
    where: { tenantId: TENANT_ID },
    _count: { _all: true },
  });
}

/** Fetch a single lead by ID */
export async function getLeadById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: { notes: true, todos: true },
  });
}
