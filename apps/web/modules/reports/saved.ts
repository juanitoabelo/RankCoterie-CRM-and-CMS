import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { normalizeReportConfig } from "./report-config";

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
  widgets: Array<{ id: string; title: string; reportId: string | null; position: number }>;
};

export async function listSavedReports(): Promise<SavedReportRecord[]> {
  const rows = await prisma.savedReport.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => ({ ...row, config: normalizeReportConfig(row.config) }));
}

export async function getSavedReport(id: string): Promise<SavedReportRecord | null> {
  const row = await prisma.savedReport.findFirst({ where: { id, tenantId: TENANT_ID } });
  return row ? { ...row, config: normalizeReportConfig(row.config) } : null;
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

export async function deleteSavedReport(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const report = await prisma.savedReport.findFirst({ where: { id, tenantId: TENANT_ID }, select: { id: true } });
  if (!report) return { ok: false, error: "Report not found." };
  await prisma.savedReport.delete({ where: { id } });
  return { ok: true };
}

export async function listSavedDashboards(): Promise<SavedDashboardRecord[]> {
  const rows = await prisma.savedDashboard.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { updatedAt: "desc" },
    include: {
      widgets: {
        orderBy: { position: "asc" },
        select: { id: true, title: true, reportId: true, position: true },
      },
    },
  });
  return rows;
}

export async function saveDashboard(input: {
  ownerId: string;
  name: string;
  description: string;
  shared: boolean;
  reportIds: string[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const name = input.name.trim().slice(0, 120);
  if (!name) return { ok: false, error: "Dashboard name is required." };

  const reports = await prisma.savedReport.findMany({
    where: { tenantId: TENANT_ID, id: { in: input.reportIds } },
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
