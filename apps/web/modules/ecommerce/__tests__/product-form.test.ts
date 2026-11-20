import { describe, expect, it } from "vitest";
import {
  parseProductBulkAction,
  parseProductFormData,
  parseVariantData,
  readIdList,
} from "../product-form";

function form(entries: Record<string, string | string[]> = {}): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      for (const item of value) formData.append(key, item);
    } else {
      formData.set(key, value);
    }
  }
  return formData;
}

describe("parseProductFormData", () => {
  it("leaves type-specific fields absent when the form does not render them", () => {
    const parsed = parseProductFormData(form({ name: "Simple Product", regularPrice: "10" }));

    expect(parsed.data).not.toHaveProperty("vendorId");
    expect(parsed.data).not.toHaveProperty("commissionRate");
    expect(parsed.data).not.toHaveProperty("subscriptionPeriod");
    expect(parsed.data).not.toHaveProperty("shippingClassId");
    expect(parsed.data).toHaveProperty("status", "DRAFT");
  });

  it("parses rendered type-specific fields", () => {
    const parsed = parseProductFormData(
      form({
        name: "Service",
        type: "SERVICE",
        shippingClassId: "ship_1",
        vendorId: "user_1",
        commissionRate: "12.5",
        commissionType: "percentage",
      }),
    );

    expect(parsed.data).toMatchObject({
      type: "SERVICE",
      shippingClassId: "ship_1",
      vendorId: "user_1",
      commissionRate: 12.5,
      commissionType: "percentage",
    });
  });

  it("parses relationship ids from both repeated fields and JSON arrays", () => {
    const parsed = parseProductFormData(
      form({
        name: "Related",
        relatedProductIds: ["p1", "p2"],
        bundleChildIds: '["p3","p4"]',
      }),
    );

    expect(parsed.relations.productLinks).toEqual({
      relatedProductIds: ["p1", "p2"],
      crossSellProductIds: [],
      upSellProductIds: [],
      bundleChildIds: ["p3", "p4"],
      groupedChildIds: [],
    });
  });

  it("throws a friendly error for malformed download files", () => {
    expect(() => parseProductFormData(form({ name: "Broken", downloadFiles: "not json" }))).toThrow(
      "Download files must be valid JSON.",
    );
  });
});

describe("parseVariantData", () => {
  it("parses variant rows and attribute JSON", () => {
    const variants = [
      {
        id: "variant_1",
        name: "Small",
        sku: "SKU-S",
        regularPrice: 10,
        salePrice: 8,
        stockStatus: "IN_STOCK",
        stockQuantity: 5,
        attributes: '{"Size":"S"}',
        downloadFiles: [{ name: "file.pdf", url: "https://example.com/file.pdf" }],
      },
    ];

    expect(parseVariantData(form({ variantData: JSON.stringify(variants) }))).toEqual([
      expect.objectContaining({
        id: "variant_1",
        name: "Small",
        sku: "SKU-S",
        regularPrice: 10,
        salePrice: 8,
        stockQuantity: 5,
        menuOrder: 0,
        attributes: { Size: "S" },
        downloadFiles: [{ name: "file.pdf", url: "https://example.com/file.pdf" }],
      }),
    ]);
  });

  it("rejects malformed variant attributes", () => {
    expect(() =>
      parseVariantData(
        form({
          variantData: JSON.stringify([
            { name: "Small", regularPrice: 10, attributes: "not json" },
          ]),
        }),
      ),
    ).toThrow("Variant 1 attributes must be valid JSON.");
  });
});

describe("bulk parsing", () => {
  it("parses valid status and featured actions", () => {
    expect(parseProductBulkAction(form({ action: "status", value: "PUBLISHED" }))).toEqual({
      ok: true,
      action: "status",
      value: "PUBLISHED",
    });
    expect(parseProductBulkAction(form({ action: "featured", value: "true" }))).toEqual({
      ok: true,
      action: "featured",
      value: true,
    });
  });

  it("rejects invalid bulk actions", () => {
    expect(parseProductBulkAction(form({ action: "status", value: "LIVE" }))).toEqual({
      ok: false,
      error: "Invalid status",
    });
    expect(parseProductBulkAction(form({ action: "tier", value: "PREMIUM" }))).toEqual({
      ok: false,
      error: "Invalid action",
    });
  });

  it("reads and deduplicates ids from repeated fields and JSON arrays", () => {
    expect(readIdList(form({ ids: ["p1", "p2", "p1"] }), "ids", "Products")).toEqual(["p1", "p2"]);
    expect(readIdList(form({ ids: '["p2","p3"]' }), "ids", "Products")).toEqual(["p2", "p3"]);
  });
});
