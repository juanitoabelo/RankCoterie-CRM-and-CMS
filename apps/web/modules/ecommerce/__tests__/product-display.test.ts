import { describe, expect, it } from "vitest";
import {
  buildProductJsonLd,
  findMatchingVariant,
  getInitialVariantOptions,
  getProductBadges,
  getReviewSummary,
  getVariantOptions,
  getStockLabel,
  isVariantPurchasable,
} from "../product-display";
import type { PublicProduct } from "../types";

function minimalProduct(overrides: Partial<PublicProduct> = {}): PublicProduct {
  return {
    id: "prod_1",
    name: "Atlas Field Jacket",
    slug: "atlas-field-jacket",
    sku: "ATLAS-001",
    shortDescription: "Weatherproof utility jacket.",
    description: "<p>Built for wet cities.</p>",
    price: 180,
    regularPrice: 180,
    salePrice: 140,
    salePriceStart: null,
    salePriceEnd: null,
    stockStatus: "IN_STOCK",
    stockQuantity: 8,
    manageStock: true,
    backorders: "no",
    lowStockAmount: 3,
    featured: false,
    type: "SIMPLE",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    averageRating: 4.5,
    reviewCount: 2,
    images: [],
    attributes: [],
    variants: [],
    categories: [],
    links: [],
    reviews: [],
    customFields: [],
    tags: [],
    taxStatus: "TAXABLE",
    taxClass: null,
    shippingClassId: null,
    shippingRequired: true,
    shippingTaxable: true,
    virtual: false,
    downloadable: false,
    weight: null,
    length: null,
    width: null,
    height: null,
    effectivePrice: {
      price: 140,
      regularPrice: 180,
      salePrice: 140,
      onSale: true,
      saleEndsAt: null,
    },
    customFieldValues: {},
    ...overrides,
  } as PublicProduct;
}

describe("product display helpers", () => {
  it("derives variant options and matches a selected combination", () => {
    const variants = [
      { attributes: { Color: "Olive", Size: "M" }, imageAssetId: "img_1" },
      { attributes: { Color: "Olive", Size: "L" }, imageAssetId: "img_2" },
      { attributes: { Color: "Black", Size: "M" }, imageAssetId: null },
    ];

    const options = getVariantOptions(variants);
    expect(options.map((option) => option.name)).toEqual(["Color", "Size"]);
    expect(options[0].values.map((value) => value.value)).toEqual(["Olive", "Black"]);

    const initial = getInitialVariantOptions(variants);
    expect(initial).toEqual({ Color: "Olive", Size: "M" });
    expect(findMatchingVariant(variants, initial)).toBe(variants[0]);
    expect(findMatchingVariant(variants, { Color: "Black", Size: "L" })).toBeNull();
  });

  it("summarizes reviews from approved rows", () => {
    const product = minimalProduct({
      reviews: [
        { rating: 5 } as PublicProduct["reviews"][number],
        { rating: 4 } as PublicProduct["reviews"][number],
      ],
    });
    const summary = getReviewSummary(product);
    expect(summary.count).toBe(2);
    expect(summary.average).toBe(4.5);
    expect(summary.distribution[0]).toEqual({ rating: 5, count: 1 });
  });

  it("builds sale and stock badges", () => {
    const badges = getProductBadges(minimalProduct(), minimalProduct().effectivePrice, new Date("2026-01-20T00:00:00.000Z"));
    expect(badges).toContain("Sale");
    expect(getStockLabel("IN_STOCK", true, 3, "no")).toBe("Only 3 left");
    expect(getStockLabel("IN_STOCK", true, 3, "no", 8)).toBe("Only 3 left");
    expect(getStockLabel("IN_STOCK", true, 6, "no", 3)).toBe("In stock");
    expect(getStockLabel("OUT_OF_STOCK", false, 0, "yes")).toBe("Available on backorder");
  });

  it("falls back to a low-stock threshold of five", () => {
    const product = minimalProduct({
      stockQuantity: 4,
      lowStockAmount: null,
      effectivePrice: {
        price: 180,
        regularPrice: 180,
        salePrice: null,
        onSale: false,
        saleEndsAt: null,
      },
    });
    const badges = getProductBadges(product, product.effectivePrice, new Date("2026-01-20T00:00:00.000Z"));
    expect(badges).toContain("Low stock");
  });

  it("builds JSON-LD with offer and aggregate rating and escapes nothing unsafe", () => {
    const product = minimalProduct({
      images: [
        {
          id: "image_1",
          productId: "prod_1",
          assetId: "asset_1",
          asset: { id: "asset_1", filename: "jacket.jpg" },
          alt: "Jacket",
          position: 0,
          isMain: true,
          createdAt: new Date(),
        },
      ],
    });
    const jsonLd = buildProductJsonLd(product, "https://example.com");
    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd.image).toEqual(["https://example.com/api/assets/asset_1/"]);
    expect(jsonLd.offers).toMatchObject([
      {
        price: "140.00",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    ]);
    expect(jsonLd.aggregateRating).toMatchObject({ ratingValue: "4.5", reviewCount: 2 });
    expect(JSON.stringify(jsonLd)).not.toContain("<script");
  });

  it("emits one JSON-LD offer per variant with effective sale pricing and availability", () => {
    const now = new Date("2026-01-20T00:00:00.000Z");
    const base = minimalProduct();
    const product = minimalProduct({
      variants: [
        {
          id: "v1",
          productId: base.id,
          sku: "ATLAS-OLIVE-M",
          name: "Olive / M",
          regularPrice: 180,
          salePrice: 140,
          price: 140,
          stockStatus: "IN_STOCK",
          stockQuantity: 4,
          manageStock: true,
          backorders: "no",
          lowStockAmount: 2,
          weight: null,
          length: null,
          width: null,
          height: null,
          imageAssetId: null,
          downloadable: false,
          downloadLimit: null,
          downloadExpiry: null,
          downloadFiles: null,
          virtual: false,
          description: null,
          purchaseNote: null,
          menuOrder: 0,
          attributes: { Color: "Olive", Size: "M" },
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "v2",
          productId: base.id,
          sku: "ATLAS-BLACK-M",
          name: "Black / M",
          regularPrice: 180,
          salePrice: null,
          price: 180,
          stockStatus: "OUT_OF_STOCK",
          stockQuantity: 0,
          manageStock: true,
          backorders: "no",
          lowStockAmount: 2,
          weight: null,
          length: null,
          width: null,
          height: null,
          imageAssetId: null,
          downloadable: false,
          downloadLimit: null,
          downloadExpiry: null,
          downloadFiles: null,
          virtual: false,
          description: null,
          purchaseNote: null,
          menuOrder: 1,
          attributes: { Color: "Black", Size: "M" },
          createdAt: now,
          updatedAt: now,
        },
      ] as PublicProduct["variants"],
    });

    const jsonLd = buildProductJsonLd(product, "https://example.com", now);
    const offers = jsonLd.offers as Array<Record<string, unknown>>;
    expect(offers).toHaveLength(2);
    expect(offers[0]).toMatchObject({
      name: "Olive / M",
      sku: "ATLAS-OLIVE-M",
      price: "140.00",
      availability: "https://schema.org/InStock",
    });
    expect(offers[1]).toMatchObject({
      price: "180.00",
      availability: "https://schema.org/OutOfStock",
    });
    expect(isVariantPurchasable(product.variants[0])).toBe(true);
    expect(isVariantPurchasable(product.variants[1])).toBe(false);
  });
});
