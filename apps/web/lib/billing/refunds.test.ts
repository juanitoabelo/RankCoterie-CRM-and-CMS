import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/shared", () => ({
  prisma: { paymentGateway: { findFirst: vi.fn() } },
  TENANT_ID: "tenant-test",
}));
vi.mock("stripe", () => ({ default: class StripeMock {} }));
vi.mock("./paypal", () => ({ readPaypalConfig: vi.fn(), refundPaypalOrder: vi.fn() }));
vi.mock("./square", () => ({ readSquareConfig: vi.fn(), refundSquareOrder: vi.fn() }));

import { computeRefund } from "./refunds";

const order = (total: number, refunded = 0) => ({ total, refundedAmount: refunded });

describe("computeRefund", () => {
  it("defaults to the full unrefunded balance", () => {
    const result = computeRefund(order(100));
    expect(result).toEqual({ amount: 100, remaining: 100, isFull: true });
  });

  it("accounts for previous partial refunds", () => {
    const result = computeRefund(order(100, 30));
    expect(result).toEqual({ amount: 70, remaining: 70, isFull: true });
  });

  it("accepts a partial amount", () => {
    const result = computeRefund(order(100), 25.5);
    expect(result).toEqual({ amount: 25.5, remaining: 100, isFull: false });
  });

  it("treats an amount equal to the remainder as full", () => {
    const result = computeRefund(order(100, 40), 60);
    expect(result).toMatchObject({ amount: 60, isFull: true });
  });

  it("rounds to cents", () => {
    const result = computeRefund(order(100), 33.333333);
    expect(result).toMatchObject({ amount: 33.33 });
  });

  it("rejects amounts above the unrefunded balance", () => {
    const result = computeRefund(order(100, 40), 61);
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("60.00");
  });

  it("rejects zero and negative amounts", () => {
    expect(computeRefund(order(100), 0)).toHaveProperty("error");
    expect(computeRefund(order(100), -5)).toHaveProperty("error");
    expect(computeRefund(order(100), Number.NaN)).toHaveProperty("error");
  });

  it("rejects refunds on an already fully refunded order", () => {
    expect(computeRefund(order(100, 100))).toHaveProperty("error");
    expect(computeRefund(order(100, 100), 10)).toHaveProperty("error");
  });

  it("tolerates a missing refundedAmount (legacy orders)", () => {
    const result = computeRefund({ total: 50, refundedAmount: null });
    expect(result).toEqual({ amount: 50, remaining: 50, isFull: true });
  });
});
