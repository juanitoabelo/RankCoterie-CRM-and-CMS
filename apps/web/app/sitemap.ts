import type { MetadataRoute } from "next";
import { getCatalogRepo } from "@/lib/directory/catalog";

export const revalidate = 3600;

const SITE_URL = process.env.SITE_URL ?? "https://masternet.org";

/**
 * Sitemap: homepage, every category, and every category × region SEO page.
 * Region slugs are legacy DomainKeys (mixed case is canonical, e.g.
 * "San-Diego-California-CA").
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = await getCatalogRepo();
  const [categories, regions] = await Promise.all([
    repo.getCategories(),
    repo.getRegions(),
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
    for (const region of regions) {
      entries.push({
        url: `${SITE_URL}/g/${cat.slug}/${region.slug}/`,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}