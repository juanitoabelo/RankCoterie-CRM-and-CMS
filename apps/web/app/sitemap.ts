import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/lib/seo/sitemap";

export const revalidate = 3600;

/**
 * Sitemap: homepage, every category, and every category × region SEO page
 * (gate-filtered — link set === index set === sitemap set), plus standalone
 * pages, published products, and LIVE articles with their region variants.
 * Regenerated hourly (revalidate = 3600) and on deploy — not on every save.
 * Shared with the admin report at /admin/sitemap via lib/seo/sitemap.ts.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemapEntries();
}
