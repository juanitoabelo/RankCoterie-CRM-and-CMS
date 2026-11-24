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

const logStructured = vi.fn();
vi.mock("@/lib/observability", () => ({
  logStructured: (...args: unknown[]) => logStructured(...args),
}));

const logAudit = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAudit: (...args: unknown[]) => logAudit(...args),
}));

import {
  claimWebhookEvent,
  logWebhookMismatch,
  NonRetryableWebhookError,
} from "./webhook-events";

const updatedAt = new Date("2026-01-01T00:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  findFirst.mockResolvedValue({ meta: { couponCode: "SAVE10" }, updatedAt });
  updateMany.mockResolvedValue({ count: 1 });
  logAudit.mockResolvedValue(undefined);
});

describe("claimWebhookEvent", () => {
  it("records a new event id without dropping existing meta", async () => {
    expect(await claimWebhookEvent("ord_1", "evt_1")).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "ord_1", tenantId: "tenant-test", updatedAt },
      data: {
        meta: { couponCode: "SAVE10", processedWebhookEvents: ["evt_1"] },
      },
    });
  });

  it("treats a repeated event as a duplicate", async () => {
    findFirst.mockResolvedValue({ meta: { processedWebhookEvents: ["evt_1"] }, updatedAt });
    expect(await claimWebhookEvent("ord_1", "evt_1")).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
    expect(logStructured).toHaveBeenCalledWith(
      expect.objectContaining({ message: "webhook_event_duplicate", level: "info" }),
    );
  });

  it("treats a lost optimistic race as a duplicate", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    expect(await claimWebhookEvent("ord_1", "evt_2")).toBe(false);
    expect(logStructured).toHaveBeenCalledWith(
      expect.objectContaining({ message: "webhook_event_duplicate" }),
    );
  });

  it("returns false for an order outside this tenant", async () => {
    findFirst.mockResolvedValue(null);
    expect(await claimWebhookEvent("ord_1", "evt_1")).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("logWebhookMismatch", () => {
  it("logs the mismatch and writes an audit record", async () => {
    await logWebhookMismatch({
      gateway: "stripe",
      eventId: "evt_1",
      orderId: "ord_1",
      reason: "amount_mismatch",
      expected: { amount: 1000, currency: "USD" },
      received: { amount: 500, currency: "USD" },
    });
    expect(logStructured).toHaveBeenCalledWith(
      expect.objectContaining({ level: "warn", message: "webhook_amount_mismatch" }),
    );
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ORDER_UPDATE",
        entity: "Order",
        entityId: "ord_1",
      }),
    );
  });
});

describe("NonRetryableWebhookError", () => {
  it("is an Error", () => {
    expect(new NonRetryableWebhookError("bad") instanceof Error).toBe(true);
  });
});
