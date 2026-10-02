import { describe, expect, it } from "vitest";
import { allocateToLines } from "./totals";

describe("allocateToLines", () => {
  it("splits discount and tax proportionally across lines", () => {
    const { lineDiscount, lineTax } = allocateToLines(
      [{ lineTotal: 30 }, { lineTotal: 70 }],
      { subtotal: 100, discount: 10, tax: 5 },
    );
    expect(lineDiscount).toEqual([3, 7]);
    expect(lineTax).toEqual([1.5, 3.5]);
    expect(lineDiscount.reduce((a, b) => a + b, 0)).toBeCloseTo(10, 2);
    expect(lineTax.reduce((a, b) => a + b, 0)).toBeCloseTo(5, 2);
  });

  it("puts the rounding remainder on the last line", () => {
    // 1/3 shares: round2 gives 3.33 + 3.33 = 6.66, last line gets 6.67.
    const { lineDiscount } = allocateToLines(
      [{ lineTotal: 10 }, { lineTotal: 10 }, { lineTotal: 10 }],
      { subtotal: 30, discount: 10, tax: 0 },
    );
    expect(lineDiscount).toEqual([3.33, 3.33, 3.34]);
    expect(lineDiscount.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it("never allocates more discount than a line is worth", () => {
    const { lineDiscount } = allocateToLines(
      [{ lineTotal: 1 }, { lineTotal: 99 }],
      { subtotal: 100, discount: 50, tax: 0 },
    );
    expect(lineDiscount[0]).toBeLessThanOrEqual(1);
    expect(lineDiscount.reduce((a, b) => a + b, 0)).toBe(50);
  });

  it("handles zero totals without dividing by zero", () => {
    const { lineDiscount, lineTax } = allocateToLines(
      [{ lineTotal: 0 }, { lineTotal: 0 }],
      { subtotal: 0, discount: 0, tax: 0 },
    );
    expect(lineDiscount).toEqual([0, 0]);
    expect(lineTax).toEqual([0, 0]);
  });

  it("handles a single line", () => {
    const { lineDiscount, lineTax } = allocateToLines(
      [{ lineTotal: 42.5 }],
      { subtotal: 42.5, discount: 2.5, tax: 3.4 },
    );
    expect(lineDiscount).toEqual([2.5]);
    expect(lineTax).toEqual([3.4]);
  });
});
