import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const couponFindFirst = vi.fn();
const orderCount = vi.fn();

vi.mock("@/modules/shared", () => ({
  prisma: {
    taxRate: { findMany: (...args: unknown[]) => findMany(...args) },
    coupon: { findFirst: (...args: unknown[]) => couponFindFirst(...args) },
    order: { count: (...args: unknown[]) => orderCount(...args) },
  },
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
  couponFindFirst.mockResolvedValue(null);
  orderCount.mockResolvedValue(0);
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

describe("quoteTotals — coupons", () => {
  it("subtracts a fixed-cart discount only once and taxes the discounted taxable base", async () => {
    couponFindFirst.mockResolvedValue({
      code: "SAVE40",
      isActive: true,
      startDate: null,
      endDate: null,
      usageLimit: null,
      usedCount: 0,
      minAmount: null,
      type: "FIXED_CART",
      amount: 40,
      productIds: [],
      excludedProductIds: [],
      categoryIds: [],
      excludedCategoryIds: [],
      individualUse: false,
      usageLimitPerUser: 0,
      excludeSaleItems: false,
      maxAmount: null,
      freeShipping: false,
    });

    const totals = await quoteTotals({
      lines: [
        { productId: "p1", quantity: 1, unitPrice: 100 },
        { productId: "p2", quantity: 1, unitPrice: 100, taxStatus: "NONE" },
      ],
      couponCode: "SAVE40",
      country: "US",
      shippingSettings: noShipping,
      pricesIncludeTax: false,
    });

    expect(totals.subtotal).toBe(200);
    expect(totals.taxableSubtotal).toBe(100);
    expect(totals.discount).toBe(40);
    expect(totals.tax).toBe(8);
    expect(totals.total).toBe(168);
  });

  it("keeps inclusive totals at the discounted price", async () => {
    couponFindFirst.mockResolvedValue({
      code: "TEN",
      isActive: true,
      startDate: null,
      endDate: null,
      usageLimit: null,
      usedCount: 0,
      minAmount: null,
      type: "PERCENT",
      amount: 10,
      productIds: [],
      excludedProductIds: [],
      categoryIds: [],
      excludedCategoryIds: [],
      individualUse: false,
      usageLimitPerUser: 0,
      excludeSaleItems: false,
      maxAmount: null,
      freeShipping: false,
    });

    const totals = await quoteTotals({
      lines: [{ productId: "p1", quantity: 1, unitPrice: 110 }],
      couponCode: "TEN",
      country: "US",
      shippingSettings: noShipping,
      pricesIncludeTax: true,
    });

    expect(totals.discount).toBe(11);
    expect(totals.tax).toBe(9);
    expect(totals.total).toBe(99);
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


describe("quoteTotals — product-targeted coupon tax math", () => {
  it("does not under-tax taxable lines when a tax-exempt line is targeted by a fixed-product coupon", async () => {
    couponFindFirst.mockResolvedValue({
      code: "OFF50",
      isActive: true,
      startDate: null,
      endDate: null,
      usageLimit: null,
      usedCount: 0,
      minAmount: null,
      type: "FIXED_PRODUCT",
      amount: 50,
      productIds: ["p_exempt"],
      excludedProductIds: [],
      excludeSaleItems: false,
      maxAmount: null,
      freeShipping: false,
    });

    const totals = await quoteTotals({
      lines: [
        { productId: "p_taxed", quantity: 1, unitPrice: 100 },
        { productId: "p_exempt", quantity: 1, unitPrice: 100, taxStatus: "NONE" },
      ],
      couponCode: "OFF50",
      country: "US",
      shippingSettings: noShipping,
      pricesIncludeTax: false,
    });

    expect(totals.subtotal).toBe(200);
    expect(totals.discount).toBe(50);
    expect(totals.tax).toBe(10);
    expect(totals.total).toBe(160);
  });

  it("applies discount and tax correctly when a taxable line is targeted by a fixed-product coupon", async () => {
    couponFindFirst.mockResolvedValue({
      code: "OFF50",
      isActive: true,
      startDate: null,
      endDate: null,
      usageLimit: null,
      usedCount: 0,
      minAmount: null,
      type: "FIXED_PRODUCT",
      amount: 50,
      productIds: ["p_taxed"],
      excludedProductIds: [],
      excludeSaleItems: false,
      maxAmount: null,
      freeShipping: false,
    });

    const totals = await quoteTotals({
      lines: [
        { productId: "p_taxed", quantity: 1, unitPrice: 100 },
        { productId: "p_exempt", quantity: 1, unitPrice: 100, taxStatus: "NONE" },
      ],
      couponCode: "OFF50",
      country: "US",
      shippingSettings: noShipping,
      pricesIncludeTax: false,
    });

    expect(totals.discount).toBe(50);
    expect(totals.tax).toBe(5);
    expect(totals.total).toBe(155);
  });

  it("does not discount a non-coupon-eligible signup fee line", async () => {
    couponFindFirst.mockResolvedValue({
      code: "TENOFF",
      isActive: true,
      startDate: null,
      endDate: null,
      usageLimit: null,
      usedCount: 0,
      minAmount: null,
      type: "PERCENT",
      amount: 10,
      productIds: [],
      excludedProductIds: [],
      categoryIds: [],
      excludedCategoryIds: [],
      individualUse: false,
      usageLimitPerUser: 0,
      excludeSaleItems: false,
      maxAmount: null,
      freeShipping: false,
    });

    const totals = await quoteTotals({
      lines: [
        { productId: "p_sub", quantity: 1, unitPrice: 100 },
        { productId: "p_sub", quantity: 1, unitPrice: 20, couponEligible: false },
      ],
      couponCode: "TENOFF",
      country: "US",
      shippingSettings: noShipping,
      pricesIncludeTax: false,
    });

    expect(totals.subtotal).toBe(120);
    expect(totals.discount).toBe(10);
    expect(totals.tax).toBe(11);
    expect(totals.total).toBe(121);
  });

  it("rejects a coupon after the customer has reached its per-user usage limit", async () => {
    couponFindFirst.mockResolvedValue({
      code: "ONCE",
      isActive: true,
      startDate: null,
      endDate: null,
      usageLimit: null,
      usageLimitPerUser: 1,
      usedCount: 5,
      minAmount: null,
      type: "PERCENT",
      amount: 10,
      productIds: [],
      excludedProductIds: [],
      categoryIds: [],
      excludedCategoryIds: [],
      individualUse: false,
      excludeSaleItems: false,
      maxAmount: null,
      freeShipping: false,
    });
    orderCount.mockResolvedValue(1);

    const totals = await quoteTotals({
      lines: [{ productId: "p1", quantity: 1, unitPrice: 100 }],
      couponCode: "ONCE",
      customer: { email: "buyer@example.com" },
      shippingSettings: noShipping,
      pricesIncludeTax: false,
    });

    expect(totals.coupon).toBeNull();
    expect(totals.couponError).toBe("You have already used this coupon.");
    expect(orderCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ meta: { path: ["couponCode"], equals: "ONCE" } }),
      }),
    );
  });
});
