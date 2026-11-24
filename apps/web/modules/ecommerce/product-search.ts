import { ProductType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type ProductSearchRankable = {
  name: string;
  sku?: string | null;
  type?: string | null;
  categories?: Array<{ category: { name: string; slug: string } }>;
};

const CONTAINS_MODE = "insensitive" as const;

/** Prisma filter covering every product field the storefront search box should match. */
export function buildProductSearchWhere(term: string): Prisma.ProductWhereInput {
  const value = term.trim();
  if (!value) return {};

  const contains = { contains: value, mode: CONTAINS_MODE };
  const lower = value.toLowerCase();
  const matchingTypes = Object.values(ProductType).filter((type) =>
    type.toLowerCase().includes(lower),
  );

  return {
    OR: [
      { name: contains },
      { sku: contains },
      { shortDescription: contains },
      { description: contains },
      {
        categories: {
          some: {
            category: { OR: [{ name: contains }, { slug: contains }] },
          },
        },
      },
      ...(matchingTypes.length > 0 ? [{ type: { in: matchingTypes } }] : []),
    ],
  };
}

/** Lower number = stronger match. Exact SKU and exact name always outrank broad hits. */
export function productSearchRank(product: ProductSearchRankable, term: string): number {
  const query = term.trim().toLowerCase();
  if (!query) return 0;

  const name = (product.name ?? "").trim().toLowerCase();
  const sku = (product.sku ?? "").trim().toLowerCase();
  if (sku === query) return 0;
  if (name === query) return 1;
  if (sku.startsWith(query)) return 2;
  if (name.startsWith(query)) return 3;

  const categories = product.categories ?? [];
  const categoryValues = categories.flatMap((link) => [
    (link.category.name ?? "").trim().toLowerCase(),
    (link.category.slug ?? "").trim().toLowerCase(),
  ]);
  if (categoryValues.some((value) => value === query)) return 4;
  if (categoryValues.some((value) => value.startsWith(query))) return 5;

  const type = (product.type ?? "").trim().toLowerCase();
  if (type === query) return 6;
  if (type.includes(query)) return 7;
  return 8;
}

/** Stable rank-first sort, with an existing ordering used as the tie-breaker. */
export function sortProductSearchRows<T extends ProductSearchRankable>(
  rows: T[],
  term: string,
  tieBreaker: (a: T, b: T) => number = () => 0,
): T[] {
  return rows
    .map((row, index) => ({ row, index, rank: productSearchRank(row, term) }))
    .sort((a, b) => a.rank - b.rank || tieBreaker(a.row, b.row) || a.index - b.index)
    .map((entry) => entry.row);
}
