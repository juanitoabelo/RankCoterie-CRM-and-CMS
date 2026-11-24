import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const create = vi.fn();
const update = vi.fn();

vi.mock("@/modules/shared", () => ({
  prisma: {
    paymentTransaction: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
  TENANT_ID: "tenant-test",
}));

const logStructured = vi.fn();
vi.mock("@/lib/observability", () => ({
  logStructured: (...args: unknown[]) => logStructured(...args),
}));
const logAudit = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAudit: (...args: unknown[]) => logAudit(...args),
}));

import { recordGatewayTransaction } from "./gateway-transactions";

const input = {
  orderId: "ord_1",
  gatewayId: "gw_1",
  amount: 42.75,
  currency: "USD",
  status: "PAID" as const,
  gatewayTransactionId: "txn_1",
  gatewayResponse: { id: "txn_1" },
  eventId: "evt_1",
};

beforeEach(() => {
  vi.clearAllMocks();
  findFirst.mockResolvedValue(null);
  create.mockResolvedValue({ id: "ptx_1" });
  update.mockResolvedValue({ id: "ptx_1" });
  logAudit.mockResolvedValue(undefined);
});

describe("recordGatewayTransaction", () => {
  it("persists a new transaction with tenant and order scope", async () => {
    expect(await recordGatewayTransaction(input)).toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-test",
        orderId: "ord_1",
        gatewayTransactionId: "txn_1",
      },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-test",
        orderId: "ord_1",
        gatewayId: "gw_1",
        amount: 42.75,
        currency: "USD",
        status: "PAID",
        gatewayTransactionId: "txn_1",
      }),
    });
  });

  it("updates an already recorded transaction instead of duplicating it", async () => {
    findFirst.mockResolvedValue({ id: "ptx_1" });
    expect(await recordGatewayTransaction(input)).toBe(true);
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: "ptx_1" },
      data: expect.objectContaining({ status: "PAID", amount: 42.75, currency: "USD" }),
    });
  });

  it("logs, audits and returns false when no gateway can be resolved", async () => {
    expect(await recordGatewayTransaction({ ...input, gatewayId: null })).toBe(false);
    expect(create).not.toHaveBeenCalled();
    expect(logStructured).toHaveBeenCalledWith(
      expect.objectContaining({ level: "error", message: "gateway_transaction_persist_failed" }),
    );
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ORDER_UPDATE", entityId: "ord_1" }),
    );
  });

  it("logs persistence failures without throwing", async () => {
    create.mockRejectedValue(new Error("db down"));
    expect(await recordGatewayTransaction(input)).toBe(false);
    expect(logStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "error",
        message: "gateway_transaction_persist_failed",
        context: expect.objectContaining({ error: "db down" }),
      }),
    );
  });
});
