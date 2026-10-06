import type { MetadataRoute } from "next";

export const revalidate = 3600;

const SITE_URL = process.env.SITE_URL ?? "https://masternet.org";

/**
 * robots.txt — allow all crawlers, point them at the sitemap.
 * Blocks /admin (proxy already guards it, this is belt-and-braces) and
 * internal API routes that shouldn't be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/checkout", "/cart", "/wishlist"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
