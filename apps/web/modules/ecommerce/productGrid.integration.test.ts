import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import { getProductGridPage } from "./queries";

const SLUG_PREFIX = "grid-test-";
let hasAsset = false;

async function cleanup() {
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.productCategory.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
}

describe("product grid query", () => {
  beforeAll(async () => {
    await cleanup();

    const asset = await prisma.asset.findFirst({ select: { id: true } });
    hasAsset = asset !== null;

    const categories = await prisma.productCategory.createManyAndReturn({
      data: [
        { tenantId: TENANT_ID, name: "Grid Test Apparel", slug: `${SLUG_PREFIX}apparel`, menuOrder: 1 },
        { tenantId: TENANT_ID, name: "Grid Test Gear", slug: `${SLUG_PREFIX}gear`, menuOrder: 2 },
        { tenantId: TENANT_ID, name: "Grid Test Home", slug: `${SLUG_PREFIX}home`, menuOrder: 3 },
        { tenantId: TENANT_ID, name: "Grid Test Hidden", slug: `${SLUG_PREFIX}hidden`, isActive: false },
      ],
    });
    const [apparel, gear, home] = categories;

    const plans = [
      { name: "Apparel One", cat: apparel.id },
      { name: "Apparel Two", cat: apparel.id },
      { name: "Apparel Three", cat: apparel.id },
      { name: "Apparel Four", cat: apparel.id },
      { name: "Apparel Five", cat: apparel.id },
      { name: "Gear One", cat: gear.id },
      { name: "Gear Two", cat: gear.id },
      { name: "Gear Three", cat: gear.id },
      { name: "Gear Four", cat: gear.id },
      { name: "Home One", cat: home.id },
      { name: "Home Two", cat: home.id },
      { name: "Home Three", cat: home.id },
    ];

    for (const [index, plan] of plans.entries()) {
      const regular = 9.99 + index * 10;
      const onSale = index % 4 === 1;
      const price = onSale ? Math.round(regular * 0.7 * 100) / 100 : regular;
      const slug = `${SLUG_PREFIX}${plan.name.toLowerCase().replace(/\s+/g, "-")}`;
      const product = await prisma.product.create({
        data: {
          tenantId: TENANT_ID,
          name: `Grid Test ${plan.name}`,
          slug,
          sku: `GRID-${String(index + 1).padStart(3, "0")}`,
          status: "PUBLISHED",
          visibility: "PUBLIC",
          shortDescription: `<p>Short blurb for ${plan.name} with <strong>markup</strong>.</p>`,
          description: "<p>Long description.</p>",
          regularPrice: regular,
          price,
          salePrice: onSale ? price : null,
          salePriceStart: onSale ? new Date(Date.now() - 86_400_000) : null,
          salePriceEnd: onSale ? new Date(Date.now() + 86_400_000) : null,
          averageRating: 3.5 + (index % 3) * 0.5,
          reviewCount: 1 + index * 3,
          stockStatus: index === 11 ? "OUT_OF_STOCK" : "IN_STOCK",
          featured: index === 0,
          publishedAt: new Date(),
        },
      });
      await prisma.productCategoryLink.create({
        data: { productId: product.id, categoryId: plan.cat, isPrimary: true },
      });
      if (asset && (index === 0 || index === 1)) {
        await prisma.productImage.create({
          data: { productId: product.id, assetId: asset.id, isMain: true },
        });
      }
    }

    // Must never appear in the storefront grid.
    await prisma.product.create({
      data: {
        tenantId: TENANT_ID,
        name: "Grid Test Draft",
        slug: `${SLUG_PREFIX}draft`,
        status: "DRAFT",
        regularPrice: 50,
        price: 50,
      },
    });
    await prisma.product.create({
      data: {
        tenantId: TENANT_ID,
        name: "Grid Test Private",
        slug: `${SLUG_PREFIX}private`,
        status: "PUBLISHED",
        visibility: "PRIVATE",
        regularPrice: 60,
        price: 60,
      },
    });
  }, 60_000);

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("returns only published public products with pagination", async () => {
    const page1 = await getProductGridPage({ perPage: 5, orderBy: "name", sortOrder: "asc" });
    expect(page1.total).toBe(12);
    expect(page1.totalPages).toBe(3);
    expect(page1.items).toHaveLength(5);
    expect(page1.items[0].name).toBe("Grid Test Apparel Five");
    expect(page1.categories.map((c) => c.slug)).toEqual([
      `${SLUG_PREFIX}apparel`,
      `${SLUG_PREFIX}gear`,
      `${SLUG_PREFIX}home`,
    ]);

    const page3 = await getProductGridPage({ perPage: 5, page: 3, orderBy: "name", sortOrder: "asc" });
    expect(page3.items).toHaveLength(2);
    expect(page3.page).toBe(3);
  });

  it("filters by category", async () => {
    const category = await prisma.productCategory.findUniqueOrThrow({
      where: { slug: `${SLUG_PREFIX}apparel` },
    });
    const page = await getProductGridPage({ categoryId: category.id, perPage: 20 });
    expect(page.total).toBe(5);
    expect(page.items.every((item) => item.categories.some((c) => c.id === category.id))).toBe(true);
  });

  it("searches by name and sku", async () => {
    const byName = await getProductGridPage({ search: "Gear Two", perPage: 20 });
    expect(byName.total).toBe(1);

    const bySku = await getProductGridPage({ search: "GRID-007", perPage: 20 });
    expect(bySku.total).toBe(1);
    expect(bySku.items[0].name).toBe("Grid Test Gear Two");
  });

  it("filters by price range and stock", async () => {
    const priced = await getProductGridPage({ minPrice: 30, maxPrice: 70, perPage: 50 });
    expect(priced.items.length).toBeGreaterThan(0);
    expect(priced.items.every((item) => item.price >= 30 && item.price <= 70)).toBe(true);

    const inStock = await getProductGridPage({ inStockOnly: true, perPage: 50 });
    expect(inStock.total).toBe(11);
    expect(inStock.items.every((item) => item.stockStatus !== "OUT_OF_STOCK")).toBe(true);
  });

  it("maps sale state and strips HTML from excerpts", async () => {
    const page = await getProductGridPage({ perPage: 50, orderBy: "name", sortOrder: "asc" });
    const saleItem = page.items.find((item) => item.name === "Grid Test Apparel Two");
    expect(saleItem?.onSale).toBe(true);
    expect(saleItem?.price).toBeLessThan(saleItem!.regularPrice);

    const fullPrice = page.items.find((item) => item.name === "Grid Test Apparel One");
    expect(fullPrice?.onSale).toBe(false);

    expect(saleItem?.excerpt).toBe("Short blurb for Apparel Two with markup.");
    if (hasAsset) {
      expect(page.items.find((item) => item.name === "Grid Test Apparel One")?.imageAssetId).toBeTruthy();
    }
  });

  it("restricts the filter bar to requested categories", async () => {
    const gear = await prisma.productCategory.findUniqueOrThrow({ where: { slug: `${SLUG_PREFIX}gear` } });
    const home = await prisma.productCategory.findUniqueOrThrow({ where: { slug: `${SLUG_PREFIX}home` } });
    const page = await getProductGridPage({ filterCategoryIds: [gear.id, home.id], perPage: 50 });
    expect(page.categories.map((c) => c.id).sort()).toEqual([gear.id, home.id].sort());
    expect(page.total).toBe(7);
  });

  it("sorts by price", async () => {
    const page = await getProductGridPage({ perPage: 50, orderBy: "price", sortOrder: "asc" });
    const prices = page.items.map((item) => item.price);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });
});
