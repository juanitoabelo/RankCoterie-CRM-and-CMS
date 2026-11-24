import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const count = vi.fn();
const categoryFindMany = vi.fn();

vi.mock("@/lib/directory/prismaCatalog", () => ({
  prisma: {
    product: {
      findMany: (...args: unknown[]) => findMany(...args),
      count: (...args: unknown[]) => count(...args),
    },
    productCategory: {
      findMany: (...args: unknown[]) => categoryFindMany(...args),
    },
  },
}));

vi.mock("@/lib/tenant", () => ({ TENANT_ID: "tenant-test" }));

import { getProductGridPage } from "../queries";

const makeRow = (name: string, sku: string, category: string) => ({
  id: `id-${sku}`,
  name,
  sku: sku.toLowerCase(),
  slug: sku.toLowerCase(),
  shortDescription: null,
  description: null,
  price: 10,
  regularPrice: 10,
  salePrice: null,
  salePriceStart: null,
  salePriceEnd: null,
  type: "SIMPLE",
  _count: { variants: 0 },
  averageRating: 0,
  reviewCount: 0,
  stockStatus: "IN_STOCK",
  featured: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  images: [],
  categories: [{ category: { id: `cat-${category}`, name: category, slug: category.toLowerCase() } }],
});

describe("product grid search query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    count.mockResolvedValue(3);
    categoryFindMany.mockResolvedValue([]);
  });

  it("passes a product-aware filter and ranks exact SKU/name matches first", async () => {
    findMany.mockResolvedValue([
      makeRow("Trailhead Guide", "TG-1", "Outdoors"),
      makeRow("Backpack", "BP-1", "Trail Gear"),
      makeRow("Trail Pack", "TRAIL", "Outdoors"),
      makeRow("Trail", "OTHER-1", "Outdoors"),
    ]);

    const page = await getProductGridPage({ search: "trail", perPage: 4 });

    expect(page.items.map((item) => item.name)).toEqual([
      "Trail Pack",
      "Trail",
      "Trailhead Guide",
      "Backpack",
    ]);
    const query = findMany.mock.calls[0][0] as {
      where: { OR: Array<Record<string, unknown>> };
      take?: number;
      skip?: number;
    };
    const serialized = JSON.stringify(query.where.OR);
    expect(serialized).toContain("shortDescription");
    expect(serialized).toContain("description");
    expect(serialized).toContain("slug");
    expect(query.take).toBe(1000);
    expect(query.skip).toBeUndefined();
  });

  it("keeps database pagination for browsing without a search term", async () => {
    findMany.mockResolvedValue([makeRow("Alpha", "A-1", "Gear")]);
    await getProductGridPage({ perPage: 9, page: 2 });
    const query = findMany.mock.calls[0][0] as { skip?: number; take?: number; where: unknown };
    expect(query.skip).toBe(9);
    expect(query.take).toBe(9);
    expect(JSON.stringify(query.where)).not.toContain("shortDescription");
  });
});
