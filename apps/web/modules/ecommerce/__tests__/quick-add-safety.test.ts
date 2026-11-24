import { describe, expect, it } from "vitest";
import { isPurchasableProductType } from "../cart-pricing";

describe("quick-add safety", () => {
  it("treats bundle as purchasable parent and grouped/external as non-direct", () => {
    expect(isPurchasableProductType("SIMPLE")).toBe(true);
    expect(isPurchasableProductType("VARIABLE")).toBe(true);
    expect(isPurchasableProductType("BUNDLE")).toBe(true);
    expect(isPurchasableProductType("GROUPED")).toBe(false);
    expect(isPurchasableProductType("EXTERNAL")).toBe(false);
  });
});
