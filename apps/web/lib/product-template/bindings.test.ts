import { describe, expect, it } from "vitest";
import {
  productBindingFields,
  productBindingTargets,
  resolveProductBinding,
} from "./bindings";
import { parseProductTemplateData, serializeProductTemplateData } from "./serialization";
import type { Block } from "@/lib/page-builder/types";
import { DEFAULT_CONTAINER_SETTINGS, type ProductTemplateProductData } from "./types";

const PRODUCT: ProductTemplateProductData = {
  id: "product-1",
  name: "Canvas Backpack",
  slug: "canvas-backpack",
  sku: "BAG-01",
  shortDescription: "A durable everyday bag.",
  description: "<p>Made for daily use.</p>",
  regularPrice: 89,
  salePrice: null,
  stockStatus: "IN_STOCK",
  averageRating: 4.5,
  reviewCount: 12,
  weight: 1.2,
  length: 40,
  width: 30,
  height: 12,
  images: [],
  customFields: [{ key: "material", label: "Material", value: "Organic cotton", group: "Details" }],
  attributes: [{ id: "value-1", attributeId: "color", name: "Color", value: "Olive" }],
};

describe("product template data bindings", () => {
  it("resolves standard, custom-field, and attribute values", () => {
    expect(resolveProductBinding(PRODUCT, "name")).toBe("Canvas Backpack");
    expect(resolveProductBinding(PRODUCT, "regularPrice")).toBe("89");
    expect(resolveProductBinding(PRODUCT, "productUrl")).toBe("/canvas-backpack");
    expect(resolveProductBinding(PRODUCT, "mainImage")).toBeNull();
    expect(resolveProductBinding(PRODUCT, "customFields.material")).toBe("Organic cotton");
    expect(resolveProductBinding(PRODUCT, "attributes.color")).toBe("Olive");
    expect(resolveProductBinding(PRODUCT, "customFields.missing")).toBeNull();
    expect(resolveProductBinding(PRODUCT, "__proto__.polluted")).toBeNull();
  });

  it("resolves selected-variant values for price, image, SKU, stock and attributes", () => {
    const variant = {
      id: "variant-1",
      name: "Olive / M",
      sku: "BAG-01-OL-M",
      regularPrice: 99,
      salePrice: 79,
      price: 79,
      onSale: true,
      stockStatus: "IN_STOCK",
      stockQuantity: 2,
      manageStock: true,
      backorders: "no",
      imageAssetId: "asset-2",
      attributes: { color: "Olive" },
      description: "Variant description",
      virtual: false,
      downloadable: false,
    };
    expect(resolveProductBinding(PRODUCT, "sku", variant)).toBe("BAG-01-OL-M");
    expect(resolveProductBinding(PRODUCT, "price", variant)).toBe("79");
    expect(resolveProductBinding(PRODUCT, "regularPrice", variant)).toBe("99");
    expect(resolveProductBinding(PRODUCT, "mainImage", variant)).toBe("/api/assets/asset-2");
    expect(resolveProductBinding(PRODUCT, "stockQuantity", variant)).toBe("2");
    expect(resolveProductBinding(PRODUCT, "attributes.color", variant)).toBe("Olive");
    expect(resolveProductBinding(PRODUCT, "name")).toBe("Canvas Backpack");
  });

  it("lists product-specific custom fields and attributes as tab binding options", () => {
    const fields = productBindingFields(PRODUCT);
    expect(fields).toEqual(expect.arrayContaining([
      { key: "customFields.material", label: "Details: Material" },
      { key: "attributes.color", label: "Attribute: Color" },
    ]));
  });

  it("exposes bindable properties for standard page-builder blocks", () => {
    expect(productBindingTargets("hero").map((target) => target.key)).toEqual([
      "heading",
      "subheading",
      "bgImage",
    ]);
    expect(productBindingTargets("image").map((target) => target.key)).toContain("src");
    expect(productBindingTargets("unknown")).toEqual([]);
  });

  it("round-trips configurable product tabs and layout settings", () => {
    const blocks: Block[] = [{
      id: "tabs-1",
      type: "productTabs",
      props: {
        tabs: [{ id: "custom-1", label: "Materials", binding: "customFields.material" }],
      },
    }];
    const encoded = serializeProductTemplateData(blocks, {
      ...DEFAULT_CONTAINER_SETTINGS,
      width: "full",
      maxWidth: 1400,
    });
    const parsed = parseProductTemplateData(encoded);
    expect(parsed.blocks).toEqual(blocks);
    expect(parsed.containerSettings).toMatchObject({ width: "full", maxWidth: 1400 });
  });
});
