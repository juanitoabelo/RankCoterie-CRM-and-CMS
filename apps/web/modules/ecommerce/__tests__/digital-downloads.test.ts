import { beforeEach, describe, expect, it, vi } from "vitest";

const orderFindFirst = vi.fn();
const grantFindMany = vi.fn();
const grantCreate = vi.fn();
const productFindMany = vi.fn();

vi.mock("@/lib/directory/prismaCatalog", () => ({
  prisma: {
    order: { findFirst: (...args: unknown[]) => orderFindFirst(...args) },
    product: { findMany: (...args: unknown[]) => productFindMany(...args) },
    digitalDownloadGrant: {
      findMany: (...args: unknown[]) => grantFindMany(...args),
      create: (...args: unknown[]) => grantCreate(...args),
    },
  },
}));

vi.mock("@/lib/tenant", () => ({ TENANT_ID: "tenant-test" }));

import { fulfillDigitalDownloadsForPaidOrder } from "../queries";

const paidOrder = {
  id: "order_1",
  paidAt: new Date("2026-01-01T00:00:00.000Z"),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  items: [
    {
      id: "item_1",
      meta: {},
      product: {
        downloadable: true,
        downloadFiles: [{ name: "Guide", url: "/api/assets/asset_1" }],
        downloadLimit: 3,
        downloadExpiry: 7,
      },
      variant: null,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  orderFindFirst.mockResolvedValue(paidOrder);
  grantFindMany.mockResolvedValue([]);
  productFindMany.mockResolvedValue([]);
  grantCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => data);
});

describe("fulfillDigitalDownloadsForPaidOrder", () => {
  it("creates limited, expiring download grants for paid digital items", async () => {
    const grants = await fulfillDigitalDownloadsForPaidOrder("order_1");

    expect(grants).toHaveLength(1);
    expect(grantCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-test",
        orderId: "order_1",
        orderItemId: "item_1",
        name: "Guide",
        url: "/api/assets/asset_1",
        downloadLimit: 3,
        expiresAt: new Date("2026-01-08T00:00:00.000Z"),
        downloadsUsed: 0,
      }),
    });
    expect(grants[0].token).toMatch(/^[a-f0-9]{48}$/);
  });

  it("does not duplicate grants when fulfillment is retried", async () => {
    grantFindMany.mockResolvedValue([{ orderItemId: "item_1", url: "/api/assets/asset_1" }]);

    const grants = await fulfillDigitalDownloadsForPaidOrder("order_1");

    expect(grants).toEqual([]);
    expect(grantCreate).not.toHaveBeenCalled();
  });

  it("grants bundle child downloadable files without double-charging parent line", async () => {
    orderFindFirst.mockResolvedValue({
      ...paidOrder,
      items: [{
        id: "item_bundle",
        meta: { bundleChildren: [{ productId: "child_1" }] },
        product: { downloadable: false, downloadFiles: [], downloadLimit: null, downloadExpiry: null },
        variant: null,
      }],
    });
    productFindMany.mockResolvedValue([{
      id: "child_1",
      name: "Child Pack",
      downloadable: true,
      downloadFiles: [{ name: "Child File", url: "/api/assets/child" }],
      downloadLimit: null,
      downloadExpiry: null,
    }]);

    const grants = await fulfillDigitalDownloadsForPaidOrder("order_1");

    expect(grants).toHaveLength(1);
    expect(grantCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderItemId: "item_bundle",
        url: "/api/assets/child",
      }),
    });
  });
});
