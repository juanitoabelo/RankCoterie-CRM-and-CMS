import { describe, expect, it } from "vitest";
import { getEffectiveProductPrice } from "../pricing";

const product = {
  price: 100,
  regularPrice: 100,
  salePrice: 80,
  salePriceStart: null,
  salePriceEnd: null,
};

describe("getEffectiveProductPrice", () => {
  it("uses the sale price when no date window is set", () => {
    expect(getEffectiveProductPrice(product)).toEqual({
      price: 80,
      regularPrice: 100,
      salePrice: 80,
      onSale: true,
      saleEndsAt: null,
    });
  });

  it("uses the regular price before the sale starts", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const result = getEffectiveProductPrice(
      {
        ...product,
        salePriceStart: new Date("2026-01-02T00:00:00.000Z"),
      },
      now,
    );

    expect(result.price).toBe(100);
    expect(result.onSale).toBe(false);
    expect(result.saleEndsAt).toBeNull();
  });

  it("uses the regular price after the sale ends", () => {
    const now = new Date("2026-01-10T00:00:00.000Z");
    const result = getEffectiveProductPrice(
      {
        ...product,
        salePriceEnd: new Date("2026-01-05T00:00:00.000Z"),
      },
      now,
    );

    expect(result.price).toBe(100);
    expect(result.onSale).toBe(false);
  });

  it("uses the regular price when no sale price exists", () => {
    const result = getEffectiveProductPrice({
      ...product,
      salePrice: null,
    });

    expect(result.price).toBe(100);
    expect(result.salePrice).toBeNull();
    expect(result.onSale).toBe(false);
  });

  it("returns the sale end date while a sale is active", () => {
    const saleEndsAt = new Date("2026-01-31T00:00:00.000Z");
    const result = getEffectiveProductPrice(
      { ...product, salePriceEnd: saleEndsAt },
      new Date("2026-01-15T00:00:00.000Z"),
    );

    expect(result.onSale).toBe(true);
    expect(result.saleEndsAt).toEqual(saleEndsAt);
  });
});
