import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRODUCT_CARD_TEMPLATE,
  normalizeProductCardTemplate,
} from "./product-card-template";

describe("product card template settings", () => {
  it("uses defaults for absent or invalid settings", () => {
    expect(normalizeProductCardTemplate(null)).toEqual(DEFAULT_PRODUCT_CARD_TEMPLATE);
    expect(normalizeProductCardTemplate({ imageAspect: "unexpected", radius: -12 })).toMatchObject({
      imageAspect: "landscape",
      radius: 14,
    });
  });

  it("normalizes persisted values and rejects invalid colors and labels", () => {
    expect(normalizeProductCardTemplate({
      imageAspect: "portrait",
      radius: 48,
      showRating: false,
      accentColor: "url(javascript:alert(1))",
      quickAddLabel: "   ",
    })).toMatchObject({
      imageAspect: "portrait",
      radius: 32,
      showRating: false,
      accentColor: DEFAULT_PRODUCT_CARD_TEMPLATE.accentColor,
      quickAddLabel: DEFAULT_PRODUCT_CARD_TEMPLATE.quickAddLabel,
    });
  });

  it("trims and bounds custom button labels", () => {
    expect(normalizeProductCardTemplate({ addToCartLabel: `  ${"A".repeat(50)}  ` }).addToCartLabel)
      .toBe("A".repeat(40));
  });
});
