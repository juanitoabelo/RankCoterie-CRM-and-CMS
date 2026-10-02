import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const update = vi.fn();

vi.mock("@/modules/shared", () => ({
  prisma: { order: { findFirst: (...args: unknown[]) => findFirst(...args), update: (...args: unknown[]) => update(...args) } },
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
  update.mockResolvedValue({});
  logAudit.mockResolvedValue(undefined);
  sendOrderPaidEmail.mockResolvedValue(undefined);
});

describe("markOrderPaid", () => {
  it("marks a pending order paid exactly once", async () => {
    const first = await markOrderPaid("ord_1", "test-webhook");
    expect(first).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0]).toMatchObject({
      where: { id: "ord_1" },
      data: { paymentStatus: "PAID", status: "PROCESSING" },
    });
    expect(logAudit).toHaveBeenCalledTimes(1);
    expect(sendOrderPaidEmail).toHaveBeenCalledTimes(1);
  });

  it("is idempotent: a second call is a no-op", async () => {
    await markOrderPaid("ord_1", "test-webhook");
    findFirst.mockResolvedValue({ ...baseOrder, paymentStatus: "PAID", status: "PROCESSING" });
    const second = await markOrderPaid("ord_1", "test-webhook");
    expect(second).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(logAudit).toHaveBeenCalledTimes(1);
    expect(sendOrderPaidEmail).toHaveBeenCalledTimes(1);
  });

  it("returns false and does nothing for an unknown order", async () => {
    findFirst.mockResolvedValue(null);
    const res = await markOrderPaid("ord_missing", "test-webhook");
    expect(res).toBe(false);
    expect(update).not.toHaveBeenCalled();
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
    expect(update).toHaveBeenCalledTimes(1);
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
