import { describe, expect, it } from "vitest";
import {
  buildProductSearchWhere,
  productSearchRank,
  sortProductSearchRows,
} from "../product-search";

const row = (name: string, sku: string | null = null, type = "SIMPLE", categories: Array<{ category: { name: string; slug: string } }> = []) => ({
  name,
  sku,
  type,
  categories,
});

describe("product search", () => {
  it("matches name, sku, excerpt/description, category name/slug and product type", () => {
    const where = buildProductSearchWhere("  subscription  ") as {
      OR: Array<Record<string, unknown>>;
    };
    const serialized = JSON.stringify(where);
    expect(serialized).toContain("name");
    expect(serialized).toContain("sku");
    expect(serialized).toContain("shortDescription");
    expect(serialized).toContain("description");
    expect(serialized).toContain("categories");
    expect(serialized).toContain("slug");
    expect(where.OR).toHaveLength(6);
    expect(JSON.stringify(buildProductSearchWhere("   "))).toBe("{}");
  });

  it("ranks exact sku and exact name above broad matches", () => {
    const term = "trail";
    const exactSku = row("Trail Pack", "TRAIL", "SIMPLE");
    const exactName = row("Trail", "OTHER-1", "SIMPLE");
    const category = row("Backpack", "BP-1", "SIMPLE", [
      { category: { name: "Trail Gear", slug: "trail-gear" } },
    ]);
    const productType = row("Wind Shell", "WS-1", "SIMPLE");
    const broad = row("Trailhead Guide", "TG-1", "SIMPLE");

    expect(productSearchRank(exactSku, term)).toBeLessThan(productSearchRank(exactName, term));
    expect(productSearchRank(exactName, term)).toBeLessThan(productSearchRank(broad, term));
    expect(productSearchRank(broad, term)).toBeLessThan(productSearchRank(category, term));

    const sorted = sortProductSearchRows(
      [broad, productType, category, exactName, exactSku],
      term,
      (a, b) => a.name.localeCompare(b.name),
    );
    expect(sorted.map((item) => item.name)).toEqual([
      "Trail Pack",
      "Trail",
      "Trailhead Guide",
      "Backpack",
      "Wind Shell",
    ]);
  });

  it("matches product type by enum value without a text contains filter", () => {
    const where = buildProductSearchWhere("subScription") as {
      OR: Array<{ type?: { in?: string[] } }>;
    };
    const typeCondition = where.OR.find((condition) => condition.type);
    expect(typeCondition?.type?.in).toContain("SUBSCRIPTION");
  });
});
