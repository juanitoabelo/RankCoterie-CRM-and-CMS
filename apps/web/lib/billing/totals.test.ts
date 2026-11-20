import { describe, expect, it } from "vitest";
import { allocateToLines } from "./totals";

describe("allocateToLines", () => {
  it("splits discount and tax proportionally across eligible lines", () => {
    const { lineDiscount, lineTax } = allocateToLines(
      [{ lineTotal: 30, productId: "a" }, { lineTotal: 70, productId: "b" }],
      { discount: 10, tax: 5, coupon: null },
    );
    expect(lineDiscount).toEqual([3, 7]);
    expect(lineTax).toEqual([1.5, 3.5]);
    expect(lineDiscount.reduce((a, b) => a + b, 0)).toBeCloseTo(10, 2);
    expect(lineTax.reduce((a, b) => a + b, 0)).toBeCloseTo(5, 2);
  });

  it("puts the rounding remainder on the last eligible line", () => {
    const { lineDiscount } = allocateToLines(
      [{ lineTotal: 10, productId: "a" }, { lineTotal: 10, productId: "b" }, { lineTotal: 10, productId: "c" }],
      { discount: 10, tax: 0, coupon: null },
    );
    expect(lineDiscount).toEqual([3.33, 3.33, 3.34]);
    expect(lineDiscount.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it("never allocates more discount than a line is worth", () => {
    const { lineDiscount } = allocateToLines(
      [{ lineTotal: 1, productId: "a" }, { lineTotal: 99, productId: "b" }],
      { discount: 50, tax: 0, coupon: null },
    );
    expect(lineDiscount[0]).toBeLessThanOrEqual(1);
    expect(lineDiscount.reduce((a, b) => a + b, 0)).toBe(50);
  });

  it("handles zero totals without dividing by zero", () => {
    const { lineDiscount, lineTax } = allocateToLines(
      [{ lineTotal: 0, productId: "a" }, { lineTotal: 0, productId: "b" }],
      { discount: 0, tax: 0, coupon: null },
    );
    expect(lineDiscount).toEqual([0, 0]);
    expect(lineTax).toEqual([0, 0]);
  });

  it("handles a single line", () => {
    const { lineDiscount, lineTax } = allocateToLines(
      [{ lineTotal: 42.5, productId: "a" }],
      { discount: 2.5, tax: 3.4, coupon: null },
    );
    expect(lineDiscount).toEqual([2.5]);
    expect(lineTax).toEqual([3.4]);
  });
});


  it("allocates discount only to eligible targeted lines and taxes discounted taxable lines", () => {
    const coupon = {
      code: "OFF50",
      type: "FIXED_PRODUCT" as const,
      amount: 50,
      freeShipping: false,
      discount: 50,
      productIds: ["p_taxed"],
      excludedProductIds: [],
      excludeSaleItems: false,
    };
    const { lineDiscount, lineTax } = allocateToLines(
      [
        { lineTotal: 100, taxable: true, couponEligible: true, productId: "p_taxed", quantity: 1, unitPrice: 100 },
        { lineTotal: 100, taxable: false, couponEligible: true, productId: "p_exempt", quantity: 1, unitPrice: 100 },
      ],
      { discount: 50, tax: 5, coupon },
    );
    expect(lineDiscount).toEqual([50, 0]);
    expect(lineTax).toEqual([5, 0]);
  });

  it("does not allocate cart discount to a non-coupon-eligible fee line", () => {
    const coupon = {
      code: "TEN",
      type: "PERCENT" as const,
      amount: 10,
      freeShipping: false,
      discount: 10,
    };
    const { lineDiscount, lineTax } = allocateToLines(
      [
        { lineTotal: 100, taxable: true, couponEligible: true, productId: "p1", quantity: 1, unitPrice: 100 },
        { lineTotal: 20, taxable: true, couponEligible: false, productId: "p1", quantity: 1, unitPrice: 20 },
      ],
      { discount: 10, tax: 11, coupon },
    );
    expect(lineDiscount).toEqual([10, 0]);
    expect(lineTax).toEqual([9, 2]);
  });
