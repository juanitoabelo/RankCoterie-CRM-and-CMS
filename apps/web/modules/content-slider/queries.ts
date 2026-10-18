/**
 * Content Slider Module — Database Queries
 *
 * Resolves a normalized list of slider items from any content type so the
 * content-slider blocks (articles, products, listings, companies, geo
 * categories, sections, topics/sub-topics) can render live data.
 */
import { ContentStatus, ListingStatus, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";

export type SliderItem = {
  id: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  url: string | null;
  badge: string | null;
};

export type SliderSource =
  | "articles"
  | "products"
  | "listings"
  | "companies"
  | "geoCategories"
  | "section"
  | "topics";

export type SliderOrderBy = "date" | "title" | "popular" | "price" | "rating";

export type SliderQuery = {
  source: SliderSource;
  /** Selected category ids (multi-select). Empty = all. */
  categoryIds?: string[];
  /** Selected section ids (multi-select). */
  sectionIds?: string[];
  /** Selected topic / sub-topic ids (multi-select). */
  topicIds?: string[];
  limit?: number;
  orderBy?: SliderOrderBy;
  sortOrder?: "asc" | "desc";
};

export const SLIDER_SOURCES: SliderSource[] = [
  "articles",
  "products",
  "listings",
  "companies",
  "geoCategories",
  "section",
  "topics",
];

export function isSliderSource(value: string): value is SliderSource {
  return (SLIDER_SOURCES as string[]).includes(value);
}

function firstImageSrc(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function excerpt(html: string | null | undefined, fallback: string | null | undefined): string | null {
  const text = (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (text) return text.length > 160 ? `${text.slice(0, 160).trimEnd()}…` : text;
  return fallback ?? null;
}

/** Fetch normalized slider items for a given content source. */
export async function getSliderItems(query: SliderQuery): Promise<SliderItem[]> {
  const limit = Math.min(48, Math.max(1, query.limit ?? 9));
  const order = query.sortOrder === "asc" ? "asc" : "desc";
  const categoryIds = (query.categoryIds ?? []).filter(Boolean);
  const sectionIds = (query.sectionIds ?? []).filter(Boolean);
  const topicIds = (query.topicIds ?? []).filter(Boolean);

  switch (query.source) {
    case "articles": {
      const rows = await prisma.contentTemplate.findMany({
        where: {
          tenantId: TENANT_ID,
          status: ContentStatus.LIVE,
          ...(categoryIds.length ? { categoryId: { in: categoryIds } } : {}),
        },
        include: { category: { select: { title: true } } },
        orderBy: query.orderBy === "title" ? { title: order } : { publishedAt: order },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: excerpt(row.body, row.metaDesc),
        image: row.ogImage ?? firstImageSrc(row.body ?? ""),
        url: row.slug ? `/${row.slug}` : null,
        badge: row.category?.title ?? null,
      }));
    }

    case "products": {
      const rows = await prisma.product.findMany({
        where: {
          tenantId: TENANT_ID,
          status: ProductStatus.PUBLISHED,
          visibility: "PUBLIC",
          ...(categoryIds.length ? { categories: { some: { categoryId: { in: categoryIds } } } } : {}),
        },
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          categories: { include: { category: { select: { name: true } } } },
        },
        orderBy:
          query.orderBy === "price"
            ? { price: order }
            : query.orderBy === "title"
              ? { name: order }
              : { publishedAt: order },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: row.shortDescription ?? null,
        image: row.images[0]?.assetId
          ? `/api/assets/${row.images[0].assetId}`
          : row.ogImage ?? null,
        url: `/${row.slug}`,
        badge: row.categories[0]?.category?.name ?? null,
      }));
    }

    case "listings": {
      const rows = await prisma.listing.findMany({
        where: {
          tenantId: TENANT_ID,
          isLandingPage: false,
          status: ListingStatus.LIVE,
          ...(categoryIds.length
            ? { categories: { some: { categoryId: { in: categoryIds } } } }
            : {}),
        },
        include: { categories: { include: { category: { select: { title: true } } } } },
        orderBy: query.orderBy === "title" ? { title: order } : { createdAt: order },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: row.summary ?? ([row.city, row.state].filter(Boolean).join(", ") || null),
        image: row.feedImage ?? row.avatarImage ?? null,
        url: `/listing/${row.slug}`,
        badge: row.categories[0]?.category?.title ?? null,
      }));
    }

    case "companies": {
      const rows = await prisma.listing.findMany({
        where: {
          tenantId: TENANT_ID,
          isLandingPage: true,
          status: ListingStatus.LIVE,
          ...(categoryIds.length
            ? { categories: { some: { categoryId: { in: categoryIds } } } }
            : {}),
        },
        orderBy: query.orderBy === "title" ? { title: order } : { createdAt: order },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.companyName || row.title,
        subtitle: row.summary ?? ([row.city, row.state].filter(Boolean).join(", ") || null),
        image: row.avatarImage ?? row.feedImage ?? null,
        url: `/LandingPage/${row.slug}`,
        badge: "Company",
      }));
    }

    case "geoCategories": {
      const rows = await prisma.category.findMany({
        where: {
          tenantId: TENANT_ID,
          status: "LIVE",
          ...(categoryIds.length ? { id: { in: categoryIds } } : {}),
          ...(topicIds.length ? { parentId: { in: topicIds } } : {}),
        },
        orderBy: { title: "asc" },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: row.description ?? null,
        image: row.ogImage ?? null,
        url: `/g/${row.slug}`,
        badge: row.parentId ? "Sub-category" : "Category",
      }));
    }

    case "section": {
      const rows = await prisma.section.findMany({
        where: {
          tenantId: TENANT_ID,
          status: "LIVE",
          ...((sectionIds.length || categoryIds.length)
            ? {
                OR: [
                  ...(sectionIds.length ? [{ id: { in: sectionIds } }] : []),
                  ...(categoryIds.length ? [{ categoryId: { in: categoryIds } }] : []),
                ],
              }
            : {}),
        },
        include: { category: { select: { slug: true, title: true } } },
        orderBy: query.orderBy === "title" ? { title: order } : { order: "asc" },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.heading || row.title,
        subtitle: row.category?.title ?? null,
        image: null,
        url: row.category?.slug ? `/g/${row.category.slug}` : null,
        badge: "Section",
      }));
    }

    case "topics": {
      const rows = await prisma.category.findMany({
        where: {
          tenantId: TENANT_ID,
          status: "LIVE",
          ...(topicIds.length
            ? { OR: [{ id: { in: topicIds } }, { parentId: { in: topicIds } }] }
            : {}),
        },
        orderBy: { title: "asc" },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: row.description ?? null,
        image: row.ogImage ?? null,
        url: `/g/${row.slug}`,
        badge: row.parentId ? "Sub-topic" : "Topic",
      }));
    }

    default:
      return [];
  }
}
