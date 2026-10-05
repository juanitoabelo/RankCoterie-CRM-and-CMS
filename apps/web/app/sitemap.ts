import type { MetadataRoute } from "next";
import { getCatalogRepo } from "@/lib/directory/catalog";
import { filterIndexableRegions } from "@/lib/directory/indexGate";
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/lib/tenant";

export const revalidate = 3600;

const SITE_URL = process.env.SITE_URL ?? "https://masternet.org";

/**
 * Sitemap: homepage, every category, and every category × region SEO page.
 * Region slugs are legacy DomainKeys (mixed case is canonical, e.g.
 * "San-Diego-California-CA").
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = await getCatalogRepo();
  const [categories, regions, products, articles, allRegions] = await Promise.all([
    repo.getCategories(),
    repo.getRegions(),
    prisma.product.findMany({
      where: { status: "PUBLISHED", visibility: "PUBLIC" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
    prisma.contentTemplate.findMany({
      where: { tenantId: TENANT_ID, status: "LIVE" },
      select: {
        slug: true,
        updatedAt: true,
        variants: { where: { status: "LIVE" }, select: { regionId: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
    prisma.region.findMany({ select: { id: true, slug: true } }),
  ]);

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  for (const cat of categories) {
    entries.push({
      url: `${SITE_URL}/g/${cat.slug}/`,
      changeFrequency: "weekly",
      priority: 0.8,
    });
    // Index gate: only regions that earn indexing are submitted (link set ===
    // index set === sitemap set — see lib/directory/indexGate.ts).
    const indexableRegions = await filterIndexableRegions(repo, cat.id, regions);
    for (const region of indexableRegions) {
      entries.push({
        url: `${SITE_URL}/g/${cat.slug}/${region.slug}/`,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  for (const product of products) {
    entries.push({
      url: `${SITE_URL}/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Single posts: base URL, the token-stripped original (?region=all), and one
  // URL per published region variant — a post with N variants becomes N+1 pages.
  const regionSlugById = new Map(allRegions.map((r) => [r.id, r.slug]));
  for (const article of articles) {
    entries.push({
      url: `${SITE_URL}/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
    entries.push({
      url: `${SITE_URL}/${article.slug}?region=all`,
      lastModified: article.updatedAt,
      changeFrequency: "weekly",
      priority: 0.5,
    });
    for (const variant of article.variants) {
      const regionSlug = regionSlugById.get(variant.regionId);
      if (!regionSlug) continue;
      entries.push({
        url: `${SITE_URL}/${article.slug}?region=${encodeURIComponent(regionSlug)}`,
        lastModified: article.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}