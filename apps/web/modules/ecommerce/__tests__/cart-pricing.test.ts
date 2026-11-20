import { describe, expect, it } from "vitest";
import {
  availableStockFor,
  cartItemKey,
  matchCartVariant,
  normalizeCartOptions,
  parseCartQuantity,
  resolveCartLinePricing,
  resolveStockSource,
} from "../cart-pricing";

const product = {
  id: "prod_1",
  price: 100,
  regularPrice: 100,
  salePrice: 80,
  salePriceStart: null,
  salePriceEnd: null,
  manageStock: true,
  stockQuantity: 4,
  backorders: "no",
};

describe("cart pricing helpers", () => {
  it("normalizes and sorts option keys for stable cart identity", () => {
    expect(normalizeCartOptions({ Color: "Black", Size: null, Fit: 2 })).toEqual({
      Color: "Black",
      Fit: "2",
    });
    expect(cartItemKey("prod_1", "var_1", { Size: "L", Color: "Black" })).toBe(
      "prod_1::var_1::Color:Black|Size:L",
    );
    expect(cartItemKey("prod_1", null, {})).toBe("prod_1::base");
  });

  it("uses active product sale pricing", () => {
    const result = resolveCartLinePricing(product, null, 2, new Date("2026-01-15T00:00:00Z"));
    expect(result.price).toBe(80);
    expect(result.regularPrice).toBe(100);
    expect(result.lineTotal).toBe(160);
    expect(result.onSale).toBe(true);
  });

  it("uses variant price and variant stock when available", () => {
    const variant = {
      id: "var_1",
      regularPrice: 120,
      salePrice: 90,
      price: 90,
      manageStock: true,
      stockQuantity: 2,
      backorders: "no",
    };
    const result = resolveCartLinePricing(product, variant, 3);
    expect(result.price).toBe(90);
    expect(result.availableStock).toBe(2);
    expect(result.lineTotal).toBe(270);
    expect(availableStockFor(variant, product)).toBe(2);
  });

  it("treats virtual products as not requiring shipping", () => {
    const result = resolveCartLinePricing({ ...product, virtual: true }, null, 1);
    expect(result.shippingRequired).toBe(false);
  });

  it("only matches variants that belong to the requested product", () => {
    const variants = [
      { id: "var_1", productId: "prod_1" },
      { id: "var_2", productId: "prod_2" },
    ];
    expect(matchCartVariant(variants, "prod_1", "var_1")?.id).toBe("var_1");
    expect(matchCartVariant(variants, "prod_1", "var_2")).toBeNull();
    expect(matchCartVariant(variants, "prod_1", null)).toBeNull();
  });

  it("uses product stock when the selected variant does not manage its own stock", () => {
    const variant = {
      id: "var_1",
      manageStock: false,
      stockQuantity: 99,
      stockStatus: "IN_STOCK",
      backorders: "no",
    };
    expect(resolveStockSource(variant, product)).toBe(product);
    expect(availableStockFor(variant, product)).toBe(4);
  });

  it("validates API quantities as finite numbers", () => {
    expect(parseCartQuantity(Number.NaN)).toBeNull();
    expect(parseCartQuantity(Number.POSITIVE_INFINITY)).toBeNull();
    expect(parseCartQuantity(0)).toBeNull();
    expect(parseCartQuantity(2.6)).toBe(3);
    expect(parseCartQuantity(0, 0)).toBe(0);
    expect(parseCartQuantity(200)).toBe(99);
  });
});
