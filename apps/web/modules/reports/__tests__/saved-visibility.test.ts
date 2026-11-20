import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const prisma = {
    savedReport: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    savedDashboard: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    dashboardWidget: { createMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});

vi.mock("@/modules/shared", () => ({
  TENANT_ID: "tenant-test",
  prisma: mocks.prisma,
}));

import {
  deleteSavedDashboard,
  deleteSavedReport,
  getSavedDashboard,
  listSavedReports,
  saveDashboard,
} from "../saved";

const viewer = { userId: "user-1", isAdmin: false };
const admin = { userId: "admin-1", isAdmin: true };
const config = { dataset: "dealsByStage", metric: "count", dimension: "stage", visualization: "bar" };

function report(overrides: Record<string, unknown> = {}) {
  return {
    id: "report-1",
    name: "Deals by stage",
    description: null,
    config,
    shared: false,
    ownerId: "user-1",
    ...overrides,
  };
}

describe("saved report and dashboard visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mocks.prisma));
    mocks.prisma.savedReport.findMany.mockResolvedValue([]);
    mocks.prisma.savedReport.findFirst.mockResolvedValue(null);
    mocks.prisma.savedDashboard.findMany.mockResolvedValue([]);
    mocks.prisma.savedDashboard.findFirst.mockResolvedValue(null);
  });

  it("limits reports to owned or shared rows for non-admins", async () => {
    mocks.prisma.savedReport.findMany.mockResolvedValue([report()]);

    const rows = await listSavedReports(viewer);

    expect(mocks.prisma.savedReport.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-test",
        OR: [{ ownerId: "user-1" }, { shared: true }],
      },
      orderBy: { updatedAt: "desc" },
    });
    expect(rows[0].config).toEqual(config);
  });

  it("does not let non-owners delete shared reports", async () => {
    mocks.prisma.savedReport.findFirst.mockResolvedValue(report({ shared: true, ownerId: "user-2" }));

    await expect(deleteSavedReport("report-1", viewer)).resolves.toEqual({
      ok: false,
      error: "Only the report owner can delete it.",
    });
    expect(mocks.prisma.savedReport.delete).not.toHaveBeenCalled();

    await expect(deleteSavedReport("report-1", admin)).resolves.toEqual({ ok: true });
    expect(mocks.prisma.savedReport.delete).toHaveBeenCalledWith({ where: { id: "report-1" } });
  });

  it("only accepts visible reports when saving a dashboard", async () => {
    mocks.prisma.savedReport.findMany.mockResolvedValue([{ id: "report-2", name: "Shared report" }]);
    mocks.prisma.savedDashboard.create.mockResolvedValue({ id: "dashboard-1" });

    const result = await saveDashboard({
      ownerId: "user-1",
      name: "Overview",
      description: "",
      shared: false,
      reportIds: ["report-1", "report-2"],
      viewer,
    });

    expect(mocks.prisma.savedReport.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["report-1", "report-2"] },
        tenantId: "tenant-test",
        OR: [{ ownerId: "user-1" }, { shared: true }],
      },
      select: { id: true, name: true },
    });
    expect(mocks.prisma.dashboardWidget.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          dashboardId: "dashboard-1",
          reportId: "report-2",
          title: "Shared report",
          position: 0,
        }),
      ],
    });
    expect(result).toEqual({ ok: true, id: "dashboard-1" });
  });

  it("loads dashboard widgets with normalized report configs", async () => {
    mocks.prisma.savedDashboard.findFirst.mockResolvedValue({
      id: "dashboard-1",
      name: "Overview",
      description: null,
      shared: true,
      ownerId: "user-2",
      widgets: [
        {
          id: "widget-1",
          title: "Deals by stage",
          reportId: "report-1",
          position: 0,
          report: report({ ownerId: "user-2", shared: true }),
        },
      ],
    });

    const dashboard = await getSavedDashboard("dashboard-1", viewer);

    expect(dashboard?.widgets[0].report?.config).toEqual(config);
    expect(dashboard?.ownerId).toBe("user-2");
  });

  it("does not let non-owners delete shared dashboards", async () => {
    mocks.prisma.savedDashboard.findFirst.mockResolvedValue({ id: "dashboard-1", ownerId: "user-2", shared: true });

    await expect(deleteSavedDashboard("dashboard-1", viewer)).resolves.toEqual({
      ok: false,
      error: "Only the dashboard owner can delete it.",
    });
    expect(mocks.prisma.savedDashboard.delete).not.toHaveBeenCalled();
  });
});
