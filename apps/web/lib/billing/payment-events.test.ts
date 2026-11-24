import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const updateMany = vi.fn();

vi.mock("@/modules/shared", () => ({
  prisma: {
    order: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      updateMany: (...args: unknown[]) => updateMany(...args),
    },
  },
  TENANT_ID: "tenant-test",
}));

const logAudit = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAudit: (...args: unknown[]) => logAudit(...args),
}));

const fulfillSubscriptionsForPaidOrder = vi.fn();
const fulfillDigitalDownloadsForPaidOrder = vi.fn();
vi.mock("@/modules/ecommerce/queries", () => ({
  fulfillSubscriptionsForPaidOrder: (...args: unknown[]) => fulfillSubscriptionsForPaidOrder(...args),
  fulfillDigitalDownloadsForPaidOrder: (...args: unknown[]) =>
    fulfillDigitalDownloadsForPaidOrder(...args),
}));

const restoreStockForOrder = vi.fn();
vi.mock("@/lib/billing/stock", () => ({
  restoreStockForOrder: (...args: unknown[]) => restoreStockForOrder(...args),
}));

const releaseOrderCoupon = vi.fn();
vi.mock("@/lib/billing/pending-orders", () => ({
  releaseOrderCoupon: (...args: unknown[]) => releaseOrderCoupon(...args),
}));

const sendOrderPaidEmail = vi.fn();
const sendOrderStatusEmail = vi.fn();
vi.mock("@/lib/email/orders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email/orders")>();
  return {
    ...actual,
    sendOrderPaidEmail: (...args: unknown[]) => sendOrderPaidEmail(...args),
    sendOrderStatusEmail: (...args: unknown[]) => sendOrderStatusEmail(...args),
    toOrderEmailData: (order: { id: string }) => ({ id: order.id }),
  };
});

const logStructured = vi.fn();
vi.mock("@/lib/observability", () => ({
  logStructured: (...args: unknown[]) => logStructured(...args),
}));

import { findOrderByGatewayRef, markOrderPaid, markOrderPaymentFailed } from "./payment-events";

const baseOrder = {
  id: "ord_1",
  orderNumber: "CAN-1001",
  paymentStatus: "PENDING",
  status: "PENDING",
  items: [{ id: "item_1" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  findFirst.mockResolvedValue(baseOrder);
  updateMany.mockResolvedValue({ count: 1 });
  logAudit.mockResolvedValue(undefined);
  sendOrderPaidEmail.mockResolvedValue(undefined);
  fulfillSubscriptionsForPaidOrder.mockResolvedValue("not-applicable");
  fulfillDigitalDownloadsForPaidOrder.mockResolvedValue([]);
  restoreStockForOrder.mockResolvedValue(undefined);
  releaseOrderCoupon.mockResolvedValue(undefined);
  sendOrderStatusEmail.mockResolvedValue(undefined);
  logStructured.mockReturnValue(undefined);
});

describe("markOrderPaid", () => {
  it("marks a pending order paid exactly once", async () => {
    const first = await markOrderPaid("ord_1", "test-webhook");
    expect(first).toBe(true);
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: "ord_1", tenantId: "tenant-test", paymentStatus: { not: "PAID" } },
      data: { paymentStatus: "PAID", status: "PROCESSING" },
    });
    expect(logAudit).toHaveBeenCalledTimes(1);
    expect(sendOrderPaidEmail).toHaveBeenCalledTimes(1);
  });

  it("is idempotent: a second call is a no-op", async () => {
    updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await markOrderPaid("ord_1", "test-webhook");
    const second = await markOrderPaid("ord_1", "test-webhook");
    expect(second).toBe(true);
    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(logAudit).toHaveBeenCalledTimes(1);
    expect(sendOrderPaidEmail).toHaveBeenCalledTimes(1);
  });

  it("returns false and does nothing for an unknown order", async () => {
    findFirst.mockResolvedValue(null);
    const res = await markOrderPaid("ord_missing", "test-webhook");
    expect(res).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
    expect(sendOrderPaidEmail).not.toHaveBeenCalled();
  });

  it("records the source in the audit log", async () => {
    await markOrderPaid("ord_1", "paypal-webhook");
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ORDER_PAID", reason: "Paid via paypal-webhook" }),
    );
  });

  it("sends the paid email even if email fails", async () => {
    sendOrderPaidEmail.mockRejectedValue(new Error("smtp down"));
    const res = await markOrderPaid("ord_1", "test");
    expect(res).toBe(true);
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it("grants digital downloads and includes their links in the paid email", async () => {
    fulfillDigitalDownloadsForPaidOrder.mockResolvedValue([
      { name: "Guide", token: "token_1" },
    ]);

    const res = await markOrderPaid("ord_1", "stripe-webhook");

    expect(res).toBe(true);
    expect(fulfillDigitalDownloadsForPaidOrder).toHaveBeenCalledWith("ord_1");
    expect(sendOrderPaidEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        downloadLinks: [{ name: "Guide", url: "/api/downloads/token_1" }],
      }),
    );
  });

  it("keeps payment confirmed when digital fulfillment fails and logs for retry", async () => {
    fulfillDigitalDownloadsForPaidOrder.mockRejectedValue(new Error("db down"));

    const res = await markOrderPaid("ord_1", "stripe-webhook");

    expect(res).toBe(true);
    expect(logStructured).toHaveBeenCalledWith(
      expect.objectContaining({ level: "error", message: "digital_fulfillment_failed" }),
    );
    expect(sendOrderPaidEmail).toHaveBeenCalledTimes(1);
  });

  it("keeps payment confirmed when subscription fulfillment fails and logs for retry", async () => {
    fulfillSubscriptionsForPaidOrder.mockRejectedValue(new Error("db down"));
    const res = await markOrderPaid("ord_1", "stripe-webhook");
    expect(res).toBe(true);
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(logStructured).toHaveBeenCalledWith(
      expect.objectContaining({ level: "error", message: "subscription_fulfillment_failed" }),
    );
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ORDER_UPDATE", reason: "Subscription fulfillment failed after payment" }),
    );
  });
});

describe("markOrderPaymentFailed", () => {
  it("marks the order failed and releases its reservations", async () => {
    const result = await markOrderPaymentFailed("ord_1", "stripe-webhook", "payment_failed");

    expect(result).toBe(true);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "ord_1",
          tenantId: "tenant-test",
          paymentStatus: { notIn: ["PAID"] },
        }),
        data: expect.objectContaining({ paymentStatus: "FAILED", status: "FAILED" }),
      }),
    );
    expect(restoreStockForOrder).toHaveBeenCalledWith("ord_1");
    expect(releaseOrderCoupon).toHaveBeenCalledWith("ord_1");
    expect(sendOrderStatusEmail).toHaveBeenCalledWith({ id: "ord_1" }, "FAILED");
  });

  it("never fails a paid order", async () => {
    findFirst.mockResolvedValue({ ...baseOrder, paymentStatus: "PAID", status: "PROCESSING" });

    const result = await markOrderPaymentFailed("ord_1", "stripe-webhook", "payment_failed");

    expect(result).toBe(true);
    expect(updateMany).not.toHaveBeenCalled();
    expect(restoreStockForOrder).not.toHaveBeenCalled();
    expect(releaseOrderCoupon).not.toHaveBeenCalled();
  });

  it("returns false for an unknown order", async () => {
    findFirst.mockResolvedValue(null);

    const result = await markOrderPaymentFailed("ord_missing", "stripe-webhook", "payment_failed");

    expect(result).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("findOrderByGatewayRef", () => {
  it("returns null for empty values", async () => {
    const res = await findOrderByGatewayRef("paypalOrderId", "");
    expect(res).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("queries by the meta path", async () => {
    findFirst.mockResolvedValue({ id: "ord_1", paymentStatus: "PENDING" });
    const res = await findOrderByGatewayRef("squareOrderId", "sq_99");
    expect(res).toEqual({ id: "ord_1", paymentStatus: "PENDING" });
    expect(findFirst).toHaveBeenCalledWith({
      where: { tenantId: "tenant-test", meta: { path: ["squareOrderId"], equals: "sq_99" } },
      select: { id: true, paymentStatus: true },
    });
  });
});
