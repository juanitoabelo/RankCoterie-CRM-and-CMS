import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();

vi.mock("@/modules/shared", () => ({
  prisma: { taxRate: { findMany: (...args: unknown[]) => findMany(...args) } },
  TENANT_ID: "tenant-test",
}));

vi.mock("@/lib/db-resilient", () => ({
  safeDb: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  },
}));

import { quoteTotals } from "./totals";

const noShipping = { enabled: false, flatRate: 0, freeOver: null };

beforeEach(() => {
  vi.clearAllMocks();
  findMany.mockResolvedValue([{ state: null, rate: 10, priority: 0 }]); // country rate 10%
});

describe("quoteTotals — tax added on top (default)", () => {
  it("adds tax to the total", async () => {
    const totals = await quoteTotals({
      lines: [{ productId: "p1", quantity: 2, unitPrice: 50 }],
      country: "US",
      shippingSettings: noShipping,
      pricesIncludeTax: false,
    });
    expect(totals.subtotal).toBe(100);
    expect(totals.tax).toBe(10);
    expect(totals.total).toBe(110);
    expect(totals.pricesIncludeTax).toBe(false);
  });
});

describe("quoteTotals — tax included in prices", () => {
  it("backs tax out of the total instead of adding it", async () => {
    const totals = await quoteTotals({
      lines: [{ productId: "p1", quantity: 1, unitPrice: 110 }],
      country: "US",
      shippingSettings: noShipping,
      pricesIncludeTax: true,
    });
    expect(totals.subtotal).toBe(110);
    expect(totals.tax).toBe(10); // 110 × 10/110
    expect(totals.total).toBe(110); // tax is not added again
    expect(totals.pricesIncludeTax).toBe(true);
  });

  it("keeps total = taxable across multi-line carts", async () => {
    const totals = await quoteTotals({
      lines: [
        { productId: "p1", quantity: 1, unitPrice: 100 },
        { productId: "p2", quantity: 1, unitPrice: 10 },
      ],
      country: "US",
      shippingSettings: noShipping,
      pricesIncludeTax: true,
    });
    expect(totals.total).toBe(110);
    expect(totals.tax).toBe(10);
  });

  it("adds shipping on top of an inclusive-price total", async () => {
    const totals = await quoteTotals({
      lines: [{ productId: "p1", quantity: 1, unitPrice: 110, shippingRequired: true }],
      country: "US",
      shippingSettings: { enabled: true, flatRate: 5, freeOver: null },
      pricesIncludeTax: true,
    });
    expect(totals.tax).toBe(10);
    expect(totals.shipping).toBe(5);
    expect(totals.total).toBe(115); // 110 (tax inside) + 5 shipping
  });
});

describe("quoteTotals — no tax rate", () => {
  it("returns zero tax when the region has no rate", async () => {
    findMany.mockResolvedValue([]);
    const totals = await quoteTotals({
      lines: [{ productId: "p1", quantity: 1, unitPrice: 100 }],
      country: "ZZ",
      shippingSettings: noShipping,
      pricesIncludeTax: true,
    });
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(100);
  });
});
