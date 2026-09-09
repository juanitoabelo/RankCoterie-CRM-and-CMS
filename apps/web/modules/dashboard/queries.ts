/**
 * Dashboard Module — Database Queries
 * 
 * All database queries for dashboard and reporting operations.
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import type { DashboardStats, ReportData, WidgetWithRelations } from "./types";

// ============================================================================
// Dashboard Stats
// ============================================================================

/** Fetch dashboard summary stats */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [pendingListings, liveListings, activeExclusions, contentTemplates] = await Promise.all([
    prisma.listing.count({ where: { tenantId: TENANT_ID, status: "PENDING_REVIEW" } }),
    prisma.listing.count({ where: { tenantId: TENANT_ID, status: "LIVE" } }),
    prisma.excludedCompany.count({ where: { tenantId: TENANT_ID, isActive: true } }),
    prisma.contentTemplate.count({ where: { tenantId: TENANT_ID } }),
  ]);

  return { pendingListings, liveListings, activeExclusions, contentTemplates };
}

// ============================================================================
// Widgets
// ============================================================================

/** Fetch active widgets for a slot */
export async function getWidgetsForSlot(slot: string): Promise<WidgetWithRelations[]> {
  return prisma.widget.findMany({
    where: {
      tenantId: TENANT_ID,
      active: true,
      placements: { some: { slot: slot as never, active: true } },
    },
    include: { placements: true },
    orderBy: { name: "asc" },
  }) as Promise<WidgetWithRelations[]>;
}

/** Fetch all widgets */
export async function getAllWidgets(): Promise<WidgetWithRelations[]> {
  return prisma.widget.findMany({
    where: { tenantId: TENANT_ID },
    include: { placements: true },
    orderBy: { createdAt: "desc" },
  }) as Promise<WidgetWithRelations[]>;
}

/** Fetch a single widget by ID */
export async function getWidgetById(id: string) {
  return prisma.widget.findUnique({
    where: { id },
    include: { placements: true },
  });
}

// ============================================================================
// Reports
// ============================================================================

/** Fetch report data */
export async function getReportData(): Promise<ReportData> {
  const [leadCounts, invoiceCounts, clientCount, liveListings, openTodos] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      where: { tenantId: TENANT_ID },
      _count: true,
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      _count: true,
      _sum: { amount: true },
    }),
    prisma.client.count({ where: { tenantId: TENANT_ID } }),
    prisma.listing.count({ where: { tenantId: TENANT_ID, status: "LIVE" } }),
    prisma.toDo.count({ where: { finishedAt: null } }),
  ]);

  // Calculate approved revenue
  const approvedInvoices = invoiceCounts.filter((i) => i.status === "APPROVED");
  const approvedRevenue = approvedInvoices.reduce(
    (sum, i) => sum + Number(i._sum?.amount ?? 0),
    0
  );

  return {
    approvedRevenue,
    clientCount,
    liveListings,
    openTodos,
    leadCounts: leadCounts.map((l) => ({ status: l.status, count: l._count })),
    invoiceCounts: invoiceCounts.map((i) => ({
      status: i.status,
      count: i._count,
      total: Number(i._sum?.amount ?? 0),
    })),
  };
}
