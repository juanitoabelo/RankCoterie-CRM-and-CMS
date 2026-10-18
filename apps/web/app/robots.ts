import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/sitemap";

export const revalidate = 3600;

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
