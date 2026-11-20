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

const sendOrderPaidEmail = vi.fn();
vi.mock("@/lib/email/orders", () => ({
  sendOrderPaidEmail: (...args: unknown[]) => sendOrderPaidEmail(...args),
  toOrderEmailData: (order: { id: string }) => ({ id: order.id }),
}));

const fulfillSubscriptionsForPaidOrder = vi.fn();
vi.mock("@/modules/ecommerce/queries", () => ({
  fulfillSubscriptionsForPaidOrder: (...args: unknown[]) => fulfillSubscriptionsForPaidOrder(...args),
}));

const logStructured = vi.fn();
vi.mock("@/lib/observability", () => ({
  logStructured: (...args: unknown[]) => logStructured(...args),
}));

import { findOrderByGatewayRef, markOrderPaid } from "./payment-events";

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
