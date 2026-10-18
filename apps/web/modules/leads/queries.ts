/**
 * Leads Module — Database Queries
 * 
 * All database queries for lead operations.
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { withDbRetry } from "@/lib/db-retry";
import { TENANT_ID } from "@/lib/tenant";
import type { LeadWithRelations, LeadFilter, PaginatedLeads } from "./types";

const DEFAULT_PAGE_SIZE = 50;

/** Fetch paginated leads */
export async function getLeads(filter: LeadFilter = {}): Promise<PaginatedLeads> {
  const { status = "ALL", search, page = 1, pageSize = DEFAULT_PAGE_SIZE, from, to } = filter;
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
  const fromDate = from && !Number.isNaN(new Date(from).getTime()) ? new Date(from) : null;
  const toDate = to && !Number.isNaN(new Date(to).getTime()) ? new Date(to) : null;
  if (fromDate || toDate) {
    where.createdAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: new Date(toDate.getTime() + 24 * 60 * 60 * 1000 - 1) } : {}),
    };
  }
  
  const [items, total] = await withDbRetry(() =>
    Promise.all([
      prisma.lead.findMany({
        where,
        include: { notes: true, todos: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.lead.count({ where }),
    ]),
  );

  return { items: items as LeadWithRelations[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Count leads per status within an optional created-at range (P3 date-range stats). */
export async function getLeadStatsInRange(from?: string, to?: string) {
  const fromDate = from && !Number.isNaN(new Date(from).getTime()) ? new Date(from) : null;
  const toDate = to && !Number.isNaN(new Date(to).getTime()) ? new Date(to) : null;
  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  if (fromDate || toDate) {
    where.createdAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: new Date(toDate.getTime() + 24 * 60 * 60 * 1000 - 1) } : {}),
    };
  }
  return withDbRetry(() =>
    prisma.lead.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
  );
}

/** Fetch lead stats by status */
export async function getLeadStats() {
  return withDbRetry(() =>
    prisma.lead.groupBy({
      by: ["status"],
      where: { tenantId: TENANT_ID },
      _count: { _all: true },
    }),
  );
}

/** Fetch a single lead by ID */
export async function getLeadById(id: string) {
  return withDbRetry(() =>
    prisma.lead.findUnique({
      where: { id },
      include: { notes: true, todos: true },
    }),
  );
}
