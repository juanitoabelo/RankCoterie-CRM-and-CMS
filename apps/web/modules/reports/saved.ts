import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { normalizeReportConfig } from "./report-config";

export type ReportViewer = {
  userId: string;
  isAdmin: boolean;
};

export type SavedReportRecord = {
  id: string;
  name: string;
  description: string | null;
  config: ReturnType<typeof normalizeReportConfig>;
  shared: boolean;
  ownerId: string;
};

export type SavedDashboardRecord = {
  id: string;
  name: string;
  description: string | null;
  shared: boolean;
  ownerId: string;
  widgets: Array<{
    id: string;
    title: string;
    reportId: string | null;
    position: number;
    report: SavedReportRecord | null;
  }>;
};

function visibleReportWhere(viewer: ReportViewer): Prisma.SavedReportWhereInput {
  return viewer.isAdmin
    ? { tenantId: TENANT_ID }
    : { tenantId: TENANT_ID, OR: [{ ownerId: viewer.userId }, { shared: true }] };
}

function visibleDashboardWhere(viewer: ReportViewer): Prisma.SavedDashboardWhereInput {
  return viewer.isAdmin
    ? { tenantId: TENANT_ID }
    : { tenantId: TENANT_ID, OR: [{ ownerId: viewer.userId }, { shared: true }] };
}

function normalizeSavedReport(row: {
  id: string;
  name: string;
  description: string | null;
  config: Prisma.JsonValue;
  shared: boolean;
  ownerId: string;
}): SavedReportRecord {
  return { ...row, config: normalizeReportConfig(row.config) };
}

export async function listSavedReports(viewer: ReportViewer): Promise<SavedReportRecord[]> {
  const rows = await prisma.savedReport.findMany({
    where: visibleReportWhere(viewer),
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(normalizeSavedReport);
}

export async function getSavedReport(id: string, viewer: ReportViewer): Promise<SavedReportRecord | null> {
  const row = await prisma.savedReport.findFirst({ where: { id, ...visibleReportWhere(viewer) } });
  return row ? normalizeSavedReport(row) : null;
}

export async function saveReport(input: {
  ownerId: string;
  name: string;
  description: string;
  config: unknown;
  shared: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const name = input.name.trim().slice(0, 120);
  if (!name) return { ok: false, error: "Report name is required." };
  const config = normalizeReportConfig(input.config);
  const report = await prisma.savedReport.create({
    data: {
      tenantId: TENANT_ID,
      ownerId: input.ownerId,
      name,
      description: input.description.trim().slice(0, 500) || null,
      config: config as unknown as Prisma.InputJsonValue,
      shared: input.shared,
    },
  });
  return { ok: true, id: report.id };
}

export async function deleteSavedReport(
  id: string,
  viewer: ReportViewer,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const report = await prisma.savedReport.findFirst({
    where: { id, ...visibleReportWhere(viewer) },
    select: { id: true, ownerId: true },
  });
  if (!report) return { ok: false, error: "Report not found." };
  if (!viewer.isAdmin && report.ownerId !== viewer.userId) {
    return { ok: false, error: "Only the report owner can delete it." };
  }
  await prisma.savedReport.delete({ where: { id } });
  return { ok: true };
}

export async function listSavedDashboards(viewer: ReportViewer): Promise<SavedDashboardRecord[]> {
  const rows = await prisma.savedDashboard.findMany({
    where: visibleDashboardWhere(viewer),
    orderBy: { updatedAt: "desc" },
    include: {
      widgets: {
        orderBy: { position: "asc" },
        include: { report: true },
      },
    },
  });
  return rows.map((row) => ({
    ...row,
    widgets: row.widgets.map((widget) => ({
      id: widget.id,
      title: widget.title,
      reportId: widget.reportId,
      position: widget.position,
      report: widget.report ? normalizeSavedReport(widget.report) : null,
    })),
  }));
}

export async function getSavedDashboard(
  id: string,
  viewer: ReportViewer,
): Promise<SavedDashboardRecord | null> {
  const row = await prisma.savedDashboard.findFirst({
    where: { id, ...visibleDashboardWhere(viewer) },
    include: {
      widgets: {
        orderBy: { position: "asc" },
        include: { report: true },
      },
    },
  });
  if (!row) return null;
  return {
    ...row,
    widgets: row.widgets.map((widget) => ({
      id: widget.id,
      title: widget.title,
      reportId: widget.reportId,
      position: widget.position,
      report: widget.report ? normalizeSavedReport(widget.report) : null,
    })),
  };
}

export async function saveDashboard(input: {
  ownerId: string;
  name: string;
  description: string;
  shared: boolean;
  reportIds: string[];
  viewer: ReportViewer;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const name = input.name.trim().slice(0, 120);
  if (!name) return { ok: false, error: "Dashboard name is required." };

  const reports = await prisma.savedReport.findMany({
    where: { id: { in: input.reportIds }, ...visibleReportWhere(input.viewer) },
    select: { id: true, name: true },
  });
  const dashboard = await prisma.$transaction(async (tx) => {
    const row = await tx.savedDashboard.create({
      data: {
        tenantId: TENANT_ID,
        ownerId: input.ownerId,
        name,
        description: input.description.trim().slice(0, 500) || null,
        shared: input.shared,
      },
    });
    await tx.dashboardWidget.createMany({
      data: reports.map((report, index) => ({
        tenantId: TENANT_ID,
        dashboardId: row.id,
        reportId: report.id,
        title: report.name,
        position: index,
        config: {} as Prisma.InputJsonValue,
      })),
    });
    return row;
  });
  return { ok: true, id: dashboard.id };
}

export async function deleteSavedDashboard(
  id: string,
  viewer: ReportViewer,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const dashboard = await prisma.savedDashboard.findFirst({
    where: { id, ...visibleDashboardWhere(viewer) },
    select: { id: true, ownerId: true },
  });
  if (!dashboard) return { ok: false, error: "Dashboard not found." };
  if (!viewer.isAdmin && dashboard.ownerId !== viewer.userId) {
    return { ok: false, error: "Only the dashboard owner can delete it." };
  }
  await prisma.savedDashboard.delete({ where: { id } });
  return { ok: true };
}
