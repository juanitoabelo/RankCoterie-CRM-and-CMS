import { describe, expect, it } from "vitest";
import {
  productBindingFields,
  productBindingTargets,
  resolveProductBinding,
} from "./bindings";
import { parseProductTemplateData, serializeProductTemplateData } from "./serialization";
import type { Block } from "@/lib/page-builder/types";
import type { ProductTemplateProductData } from "./types";

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

  it("lists product-specific custom fields and attributes as tab binding options", () => {
    const fields = productBindingFields(PRODUCT);
    expect(fields).toEqual(expect.arrayContaining([
      { key: "customFields.material", label: "Details: Material" },
      { key: "attributes.color", label: "Attribute: Color" },
    ]));
  });

  it("exposes bindable properties for standard page-builder blocks", () => {
    expect(productBindingTargets("hero").map((target) => target.key)).toEqual(["heading", "subheading"]);
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
    const encoded = serializeProductTemplateData(blocks, { width: "full", maxWidth: 1400 });
    const parsed = parseProductTemplateData(encoded);
    expect(parsed.blocks).toEqual(blocks);
    expect(parsed.containerSettings).toMatchObject({ width: "full", maxWidth: 1400 });
  });
});
