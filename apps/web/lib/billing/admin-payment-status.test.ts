import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const orderUpdate = vi.fn();

vi.mock("@/modules/shared", () => ({
  prisma: {
    order: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      update: (...args: unknown[]) => orderUpdate(...args),
    },
  },
  TENANT_ID: "tenant-test",
}));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

const requireSection = vi.fn();
vi.mock("@/modules/auth", () => ({ requireSection: (...args: unknown[]) => requireSection(...args) }));

const logAudit = vi.fn();
vi.mock("@/lib/audit", () => ({ logAudit: (...args: unknown[]) => logAudit(...args) }));

const markOrderPaid = vi.fn();
vi.mock("@/lib/billing/payment-events", () => ({
  markOrderPaid: (...args: unknown[]) => markOrderPaid(...args),
}));

const restoreStockForOrder = vi.fn();
vi.mock("@/lib/billing/stock", () => ({
  restoreStockForOrder: (...args: unknown[]) => restoreStockForOrder(...args),
}));

const refundOrderPayment = vi.fn();
const computeRefund = vi.fn();
vi.mock("@/lib/billing/refunds", () => ({
  refundOrderPayment: (...args: unknown[]) => refundOrderPayment(...args),
  computeRefund: (...args: unknown[]) => computeRefund(...args),
}));

const sendOrderRefundEmail = vi.fn();
const sendOrderStatusEmail = vi.fn();
vi.mock("@/lib/email/orders", () => ({
  sendOrderRefundEmail: (...args: unknown[]) => sendOrderRefundEmail(...args),
  sendOrderStatusEmail: (...args: unknown[]) => sendOrderStatusEmail(...args),
  toOrderEmailData: (order: unknown) => order,
}));

import { updateOrderStatus, updatePaymentStatus } from "../../app/(admin)/admin/orders/actions";

beforeEach(() => {
  vi.clearAllMocks();
  requireSection.mockResolvedValue({ id: "admin_1" });
  findFirst.mockResolvedValue({
    id: "ord_1",
    orderNumber: "CNP-1",
    paymentStatus: "AUTHORIZED",
  });
  markOrderPaid.mockResolvedValue(true);
  logAudit.mockResolvedValue(undefined);
  orderUpdate.mockResolvedValue({});
});

describe("updatePaymentStatus", () => {
  it("routes manual paid transitions through markOrderPaid", async () => {
    expect(await updatePaymentStatus("ord_1", "PAID")).toEqual({ ok: true });
    expect(markOrderPaid).toHaveBeenCalledWith("ord_1", "admin");
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: "admin_1", meta: expect.objectContaining({ to: "PAID" }) }),
    );
  });

  it("is a no-op when the order is already paid", async () => {
    findFirst.mockResolvedValue({
      id: "ord_1",
      orderNumber: "CNP-1",
      paymentStatus: "PAID",
    });
    expect(await updatePaymentStatus("ord_1", "PAID")).toEqual({ ok: true });
    expect(markOrderPaid).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("keeps direct updates for non-paid statuses", async () => {
    expect(await updatePaymentStatus("ord_1", "FAILED")).toEqual({ ok: true });
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "ord_1" },
      data: { paymentStatus: "FAILED" },
    });
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("refuses to cancel a manual order through either admin status field", async () => {
    findFirst.mockResolvedValue({
      id: "ord_1",
      orderNumber: "CNP-1",
      status: "ON_HOLD",
      paymentStatus: "AUTHORIZED",
      meta: { manualPayment: true },
    });

    expect(await updateOrderStatus("ord_1", "CANCELLED")).toMatchObject({
      ok: false,
      error: expect.stringContaining("Manual/offline"),
    });
    expect(await updatePaymentStatus("ord_1", "CANCELLED")).toMatchObject({
      ok: false,
      error: expect.stringContaining("Manual/offline"),
    });
    expect(orderUpdate).not.toHaveBeenCalled();
  });
});
