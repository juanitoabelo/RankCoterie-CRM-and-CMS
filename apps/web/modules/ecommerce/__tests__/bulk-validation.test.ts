import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { TENANT_ID } from "@/lib/tenant";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  logAudit: vi.fn(),
  getApiUser: vi.fn(),
  canAccess: vi.fn(),
}));

vi.mock("@/lib/directory/prismaCatalog", () => ({
  prisma: {
    product: {
      updateMany: (...args: unknown[]) => mocks.updateMany(...args),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: (...args: unknown[]) => mocks.logAudit(...args),
}));

vi.mock("@/modules/auth", () => ({
  getApiUser: () => mocks.getApiUser(),
  canAccessSectionForUser: (...args: unknown[]) => mocks.canAccess(...args),
}));

import { POST } from "../../../app/api/admin/products/bulk/route";

function request(formData: FormData): NextRequest {
  return { formData: async () => formData } as unknown as NextRequest;
}

function form(entries: Record<string, string | string[]>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      for (const item of value) formData.append(key, item);
    } else {
      formData.set(key, value);
    }
  }
  return formData;
}

describe("admin product bulk route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApiUser.mockResolvedValue({ id: "user_1" });
    mocks.canAccess.mockResolvedValue(true);
    mocks.updateMany.mockResolvedValue({ count: 2 });
  });

  it("rejects invalid statuses without writing to the database", async () => {
    const response = await POST(request(form({ ids: "p1", action: "status", value: "LIVE" })));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid status" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("updates tenant-scoped products and audits the change", async () => {
    const response = await POST(
      request(form({ ids: ["p1", "p2"], action: "status", value: "PUBLISHED" })),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, count: 2 });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["p1", "p2"] }, tenantId: TENANT_ID },
      data: { status: "PUBLISHED" },
    });
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PRODUCT_BULK_STATUS", entity: "Product" }),
    );
  });

  it("supports featured updates", async () => {
    const response = await POST(
      request(form({ ids: "p1", action: "featured", value: "true" })),
    );

    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["p1"] }, tenantId: TENANT_ID },
      data: { featured: true },
    });
  });
});
