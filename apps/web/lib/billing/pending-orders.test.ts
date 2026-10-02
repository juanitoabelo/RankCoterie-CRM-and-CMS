import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const couponUpdateMany = vi.fn();
const orderFindUnique = vi.fn();
const orderUpdateMany = vi.fn();
const orderUpdate = vi.fn();
const orderFindMany = vi.fn();

vi.mock("@/modules/shared", () => ({
  prisma: {
    coupon: { updateMany: (...args: unknown[]) => couponUpdateMany(...args) },
    order: {
      findUnique: (...args: unknown[]) => orderFindUnique(...args),
      updateMany: (...args: unknown[]) => orderUpdateMany(...args),
      update: (...args: unknown[]) => orderUpdate(...args),
      findMany: (...args: unknown[]) => orderFindMany(...args),
    },
  },
  TENANT_ID: "tenant-test",
}));

const restoreStockForOrder = vi.fn();
vi.mock("@/lib/billing/stock", () => ({
  restoreStockForOrder: (...args: unknown[]) => restoreStockForOrder(...args),
}));

const logAudit = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAudit: (...args: unknown[]) => logAudit(...args),
}));

import {
  adjustCouponUsage,
  releaseAbandonedOrders,
  releaseOrderCoupon,
  releasePendingOrder,
} from "./pending-orders";

beforeEach(() => {
  vi.clearAllMocks();
  couponUpdateMany.mockResolvedValue({ count: 1 });
  orderUpdateMany.mockResolvedValue({ count: 1 });
  orderUpdate.mockResolvedValue({});
  orderFindMany.mockResolvedValue([]);
  orderFindUnique.mockResolvedValue({ meta: {} });
  restoreStockForOrder.mockResolvedValue(undefined);
  logAudit.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.ABANDONED_ORDER_MINUTES;
});

describe("adjustCouponUsage", () => {
  it("increments usedCount without a floor guard", async () => {
    await adjustCouponUsage("SAVE10", 1);
    expect(couponUpdateMany).toHaveBeenCalledWith({
      where: expect.not.objectContaining({ usedCount: expect.anything() }),
      data: { usedCount: { increment: 1 } },
    });
    const where = couponUpdateMany.mock.calls[0][0].where;
    expect(where.code).toEqual({ equals: "SAVE10", mode: "insensitive" });
    expect(where.tenantId).toBe("tenant-test");
  });

  it("decrements with a gte:1 floor so usedCount never goes negative", async () => {
    await adjustCouponUsage("SAVE10", -1);
    expect(couponUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ usedCount: { gte: 1 } }),
      data: { usedCount: { increment: -1 } },
    });
  });
});

describe("releaseOrderCoupon", () => {
  it("claims the release and decrements the recorded coupon code", async () => {
    orderFindUnique.mockResolvedValue({ meta: { couponCode: "SAVE10" } });

    await releaseOrderCoupon("ord_1");

    expect(orderUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: { meta: { path: ["couponReleased"], equals: true } },
        }),
        data: { meta: expect.objectContaining({ couponReleased: true }) },
      }),
    );
    expect(couponUpdateMany).toHaveBeenCalledTimes(1);
    const where = couponUpdateMany.mock.calls[0][0].where;
    expect(where.code).toEqual({ equals: "SAVE10", mode: "insensitive" });
  });

  it("is a no-op when the release was already claimed (no double decrement)", async () => {
    orderFindUnique.mockResolvedValue({ meta: { couponCode: "SAVE10", couponReleased: true } });
    orderUpdateMany.mockResolvedValue({ count: 0 });

    await releaseOrderCoupon("ord_1");

    expect(couponUpdateMany).not.toHaveBeenCalled();
  });

  it("claims but never decrements when the order had no coupon", async () => {
    orderFindUnique.mockResolvedValue({ meta: { checkoutToken: "tok" } });

    await releaseOrderCoupon("ord_1");

    expect(orderUpdateMany).toHaveBeenCalledTimes(1);
    expect(couponUpdateMany).not.toHaveBeenCalled();
  });
});

describe("releasePendingOrder", () => {
  it("restores stock, releases the coupon, and cancels the order", async () => {
    orderFindUnique
      .mockResolvedValueOnce({ meta: { couponCode: "SAVE10" } })
      .mockResolvedValueOnce({ meta: { couponCode: "SAVE10", couponReleased: true } });

    await releasePendingOrder("ord_1", "abandoned-timeout");

    expect(restoreStockForOrder).toHaveBeenCalledWith("ord_1");
    expect(couponUpdateMany).toHaveBeenCalledTimes(1);
    expect(orderUpdate).toHaveBeenCalledTimes(1);
    const data = orderUpdate.mock.calls[0][0].data;
    expect(data.status).toBe("CANCELLED");
    expect(data.paymentStatus).toBe("CANCELLED");
    expect(data.meta.cancelledReason).toBe("abandoned-timeout");
    expect(data.meta.pendingReleased).toBe(true);
    // meta is re-read after the claim so the flag isn't wiped by this write
    expect(data.meta.couponReleased).toBe(true);
  });

  it("is safe when the order row is gone", async () => {
    orderFindUnique.mockResolvedValue(null);

    await releasePendingOrder("ord_gone", "superseded-by-retry");

    expect(restoreStockForOrder).toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });
});

describe("releaseAbandonedOrders", () => {
  it("releases only PENDING orders older than the timeout and reports counts", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    orderFindMany.mockResolvedValue([
      { id: "ord_1", orderNumber: "CNP-A" },
      { id: "ord_2", orderNumber: "CNP-B" },
    ]);

    const result = await releaseAbandonedOrders(now);

    expect(result).toEqual({ scanned: 2, released: 2 });
    const args = orderFindMany.mock.calls[0][0];
    expect(args.where.status).toBe("PENDING");
    expect(args.where.paymentStatus).toBe("PENDING");
    expect(args.where.createdAt).toEqual({ lt: new Date(now.getTime() - 60 * 60_000) });
    expect(restoreStockForOrder).toHaveBeenCalledTimes(2);
    expect(orderUpdate).toHaveBeenCalledTimes(2);
    expect(logAudit).toHaveBeenCalledTimes(2);
    expect(logAudit.mock.calls[0][0].meta).toMatchObject({
      orderNumber: "CNP-A",
      source: "abandoned-order-sweep",
    });
  });

  it("honors ABANDONED_ORDER_MINUTES", async () => {
    process.env.ABANDONED_ORDER_MINUTES = "15";
    const now = new Date("2026-01-01T00:00:00.000Z");

    await releaseAbandonedOrders(now);

    const args = orderFindMany.mock.calls[0][0];
    expect(args.where.createdAt).toEqual({ lt: new Date(now.getTime() - 15 * 60_000) });
  });

  it("clamps the timeout to a sane minimum", async () => {
    process.env.ABANDONED_ORDER_MINUTES = "1";
    const now = new Date("2026-01-01T00:00:00.000Z");

    await releaseAbandonedOrders(now);

    const args = orderFindMany.mock.calls[0][0];
    expect(args.where.createdAt).toEqual({ lt: new Date(now.getTime() - 5 * 60_000) });
  });
});
