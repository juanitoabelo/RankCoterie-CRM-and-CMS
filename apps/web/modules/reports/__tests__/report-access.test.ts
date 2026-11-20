import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const prisma = {
    user: { findMany: vi.fn() },
    lead: { findMany: vi.fn() },
    deal: { findMany: vi.fn() },
  };
  return { prisma };
});

vi.mock("@/modules/shared", () => ({
  TENANT_ID: "tenant-test",
  prisma: mocks.prisma,
}));

import { runReport } from "../query";

const access = { userId: "user-1", isAdmin: false, ownedOnly: true };
const config = { dataset: "dealsByStage", metric: "count", dimension: "stage", visualization: "bar" };

describe("runReport access scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.user.findMany.mockResolvedValue([]);
    mocks.prisma.lead.findMany.mockResolvedValue([]);
    mocks.prisma.deal.findMany.mockResolvedValue([]);
  });

  it("scopes deal reports to owned deals for restricted CRM users", async () => {
    await runReport(config, access);

    expect(mocks.prisma.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-test", ownerId: "user-1" },
      }),
    );
  });

  it("scopes lead reports to assigned leads for restricted CRM users", async () => {
    await runReport({ ...config, dataset: "leadsBySource", dimension: "source" }, access);

    expect(mocks.prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-test", assignedToId: "user-1" },
      }),
    );
  });

  it("does not add ownership filters for admins", async () => {
    await runReport(config, { userId: "admin-1", isAdmin: true, ownedOnly: false });

    expect(mocks.prisma.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-test" },
      }),
    );
  });
});
