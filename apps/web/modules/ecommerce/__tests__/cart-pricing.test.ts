import { describe, expect, it } from "vitest";
import {
  availableStockFor,
  cartItemKey,
  isPurchasableProductType,
  matchCartVariant,
  normalizeCartOptions,
  parseCartQuantity,
  repriceCartItem,
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

  it("allows only directly purchasable product types in the cart", () => {
    expect(isPurchasableProductType("SIMPLE")).toBe(true);
    expect(isPurchasableProductType("VARIABLE")).toBe(true);
    expect(isPurchasableProductType("SUBSCRIPTION")).toBe(true);
    expect(isPurchasableProductType("SERVICE")).toBe(true);
    expect(isPurchasableProductType("EXTERNAL")).toBe(false);
    expect(isPurchasableProductType("GROUPED")).toBe(false);
    expect(isPurchasableProductType("BUNDLE")).toBe(true);
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

  it("respects variant sale windows from attributes metadata", () => {
    const variant = {
      id: "var_1",
      regularPrice: 120,
      salePrice: 90,
      price: 90,
      manageStock: true,
      stockQuantity: 2,
      backorders: "no",
      attributes: {
        __salePriceStart: "2026-01-01T00:00:00.000Z",
        __salePriceEnd: "2026-01-02T00:00:00.000Z",
      },
    };
    const active = resolveCartLinePricing(product, variant, 1, new Date("2026-01-01T12:00:00.000Z"));
    expect(active.price).toBe(90);
    expect(active.onSale).toBe(true);
    const expired = resolveCartLinePricing(product, variant, 1, new Date("2026-01-03T00:00:00.000Z"));
    expect(expired.price).toBe(120);
    expect(expired.onSale).toBe(false);
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

describe("repriceCartItem", () => {
  const pricedProduct = {
    ...product,
    name: "Widget",
    taxStatus: "TAXABLE",
    taxClass: "standard",
    shippingClassId: "ship_1",
    weight: 2,
    length: 3,
    width: 4,
    height: 5,
  };

  it("uses current effective pricing instead of stale stored cart prices", () => {
    const result = repriceCartItem(
      {
        id: "item_1",
        productId: "prod_1",
        variantId: null,
        quantity: 2,
        price: 100,
        lineTotal: 200,
        product: pricedProduct,
        variant: null,
      },
      new Date("2026-01-15T00:00:00Z"),
    );

    expect(result.price).toBe(80);
    expect(result.lineTotal).toBe(160);
    expect(result.line.unitPrice).toBe(80);
    expect(result.line.saleItem).toBe(true);
  });

  it("carries taxable and shipping metadata into the quote line", () => {
    const result = repriceCartItem({
      id: "item_2",
      productId: "prod_1",
      variantId: "var_1",
      quantity: 1,
      price: 90,
      lineTotal: 90,
      product: pricedProduct,
      variant: {
        id: "var_1",
        name: "Large",
        sku: "WID-L",
        price: 90,
        regularPrice: 120,
        salePrice: 90,
        manageStock: true,
        stockQuantity: 2,
        weight: 6,
        length: 7,
        width: 8,
        height: 9,
      },
    });

    expect(result.line.taxable).toBe(true);
    expect(result.line.taxStatus).toBe("TAXABLE");
    expect(result.line.shippingClassId).toBe("ship_1");
    expect(result.line.weight).toBe(6);
    expect(result.line.length).toBe(7);
    expect(result.line.width).toBe(8);
    expect(result.line.height).toBe(9);
  });

  it("marks non-taxable products correctly", () => {
    const result = repriceCartItem({
      id: "item_3",
      productId: "prod_1",
      variantId: null,
      quantity: 1,
      price: 100,
      lineTotal: 100,
      product: { ...pricedProduct, taxStatus: "NONE" },
      variant: null,
    });

    expect(result.line.taxable).toBe(false);
  });

  it("maps cart categories to categoryIds for coupon targeting", () => {
    const result = repriceCartItem({
      id: "item_cat",
      productId: "prod_1",
      variantId: null,
      quantity: 1,
      price: 100,
      lineTotal: 100,
      product: { ...pricedProduct, categoryIds: undefined, categories: [{ categoryId: "cat_1" }] },
      variant: null,
    });
    expect(result.line.categoryIds).toEqual(["cat_1"]);
  });

  it("preserves bundle children from cart item meta", () => {
    const result = repriceCartItem({
      id: "item_bundle",
      productId: "prod_bundle",
      variantId: null,
      quantity: 1,
      price: 50,
      lineTotal: 50,
      meta: { bundleChildren: [{ productId: "child_1", quantity: 1, name: "Child" }] },
      product: { ...pricedProduct, id: "prod_bundle" },
      variant: null,
    });
    expect(result.line.bundleChildren).toEqual([{ productId: "child_1", quantity: 1, name: "Child", sku: null, variantId: null }]);
  });
});
