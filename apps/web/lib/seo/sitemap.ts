import type { MetadataRoute } from "next";
import { getCatalogRepo } from "@/lib/directory/catalog";
import { filterIndexableRegions } from "@/lib/directory/indexGate";
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/lib/tenant";

export const SITE_URL = process.env.SITE_URL ?? "https://masternet.org";

/** One labelled slice of the sitemap, used by the admin report view. */
export type SitemapGroup = {
  key: string;
  label: string;
  urls: string[];
};

export type SitemapReport = {
  siteUrl: string;
  total: number;
  groups: SitemapGroup[];
  entries: MetadataRoute.Sitemap;
};

/**
 * Build the full sitemap plus a grouped report of it in a single pass.
 *
 * Homepage, every category, and every category × region SEO page
 * (gate-filtered — link set === index set === sitemap set), plus standalone
 * pages, published products, and LIVE articles with their region variants.
 * Region slugs are legacy DomainKeys (mixed case is canonical, e.g.
 * "San-Diego-California-CA").
 */
export async function buildSitemapReport(): Promise<SitemapReport> {
  const repo = await getCatalogRepo();
  const [categories, regions, products, articles, allRegions, pages] = await Promise.all([
    repo.getCategories(),
    repo.getRegions(),
    prisma.product.findMany({
      where: { status: "PUBLISHED", visibility: "PUBLIC" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
    prisma.contentTemplate.findMany({
      where: { tenantId: TENANT_ID, status: "LIVE", robotsIndex: true },
      select: {
        slug: true,
        updatedAt: true,
        variants: { where: { status: "LIVE" }, select: { regionId: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
    prisma.region.findMany({ select: { id: true, slug: true } }),
    prisma.page.findMany({
      where: { tenantId: TENANT_ID, status: "LIVE", robotsIndex: true, isHomepage: false },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
  ]);

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  const categoryUrls: string[] = [];
  const regionUrls: string[] = [];

  for (const cat of categories) {
    // Mirror generateMetadata: /g/* robots = gate AND category.robotsIndex —
    // a category turned noindex drops its parent AND all its region URLs here.
    if (!cat.robotsIndex) continue;
    const categoryUrl = `${SITE_URL}/g/${cat.slug}/`;
    categoryUrls.push(categoryUrl);
    entries.push({
      url: categoryUrl,
      changeFrequency: "weekly",
      priority: 0.8,
    });
    // Index gate: only regions that earn indexing are submitted (link set ===
    // index set === sitemap set — see lib/directory/indexGate.ts).
    const indexableRegions = await filterIndexableRegions(repo, cat.id, regions);
    for (const region of indexableRegions) {
      const regionUrl = `${SITE_URL}/g/${cat.slug}/${region.slug}/`;
      regionUrls.push(regionUrl);
      entries.push({
        url: regionUrl,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  const productUrls: string[] = [];
  for (const product of products) {
    const url = `${SITE_URL}/${product.slug}`;
    productUrls.push(url);
    entries.push({
      url,
      lastModified: product.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Single posts: base URL, the token-stripped original (?region=all), and one
  // URL per published region variant — a post with N variants becomes N+1 pages.
  const articleUrls: string[] = [];
  const articleRegionUrls: string[] = [];
  const regionSlugById = new Map(allRegions.map((r) => [r.id, r.slug]));
  for (const article of articles) {
    const baseUrl = `${SITE_URL}/${article.slug}`;
    articleUrls.push(baseUrl);
    entries.push({
      url: baseUrl,
      lastModified: article.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
    const allUrl = `${SITE_URL}/${article.slug}?region=all`;
    articleRegionUrls.push(allUrl);
    entries.push({
      url: allUrl,
      lastModified: article.updatedAt,
      changeFrequency: "weekly",
      priority: 0.5,
    });
    for (const variant of article.variants) {
      const regionSlug = regionSlugById.get(variant.regionId);
      if (!regionSlug) continue;
      const variantUrl = `${SITE_URL}/${article.slug}?region=${encodeURIComponent(regionSlug)}`;
      articleRegionUrls.push(variantUrl);
      entries.push({
        url: variantUrl,
        lastModified: article.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  // Standalone pages (Page content type, served at /{slug}).
  const pageUrls: string[] = [];
  for (const page of pages) {
    if (!page.slug) continue;
    const url = `${SITE_URL}/${page.slug}`;
    pageUrls.push(url);
    entries.push({
      url,
      lastModified: page.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  const groups: SitemapGroup[] = [
    { key: "home", label: "Homepage", urls: [`${SITE_URL}/`] },
    { key: "categories", label: "Categories", urls: categoryUrls },
    { key: "regions", label: "Category × Region", urls: regionUrls },
    { key: "products", label: "Products", urls: productUrls },
    { key: "articles", label: "Articles", urls: articleUrls },
    { key: "articleRegions", label: "Article Region Variants", urls: articleRegionUrls },
    { key: "pages", label: "Standalone Pages", urls: pageUrls },
  ];

  return { siteUrl: SITE_URL, total: entries.length, groups, entries };
}

export async function buildSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  return (await buildSitemapReport()).entries;
}
