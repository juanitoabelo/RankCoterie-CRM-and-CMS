/**
 * GeoCategory (/g/*) SEO helpers — canonicals, metadata, JSON-LD.
 *
 * §4 of docs/geocategory-and-page-generation.md:
 *  - self-referencing canonicals on every /g/* page (admin canonicalUrl overrides
 *    the PARENT page only — region pages are unique content and always self-canonicalize)
 *  - robots index/follow honored from the GeoCategory SEO settings
 *  - BreadcrumbList + ItemList structured data (the /g tree previously emitted none)
 *  - admin-authored JSON-LD from the Schema tab, injected alongside the built-ins
 *
 * seoTitle / metaDesc may contain {{region}} tokens: they are rendered per region so
 * 665 region pages never share an identical <title> (identical titles would defeat
 * the whole point of the page multiplication).
 */

import type { Metadata } from "next";
import type { CatalogCategory, CatalogRegion } from "@/lib/directory/catalog";
import { renderLocalizedContent, regionContext } from "@/lib/localization/render";

export const SITE_URL = (process.env.SITE_URL ?? "https://masternet.org").replace(/\/+$/, "");

export function geoCategoryUrl(categorySlug: string): string {
  return `${SITE_URL}/g/${categorySlug}/`;
}

export function geoRegionUrl(categorySlug: string, regionSlug: string): string {
  return `${SITE_URL}/g/${categorySlug}/${regionSlug}/`;
}

export function geoRegionPageUrl(categorySlug: string, regionSlug: string, pageNum: number): string {
  return `${SITE_URL}/g/${categorySlug}/${regionSlug}/page/${pageNum}/`;
}

export function regionDisplayName(reg: Pick<CatalogRegion, "city" | "state" | "stateFull">): string {
  return reg.city ? `${reg.city}, ${reg.state}` : reg.stateFull;
}

function baseMetadata(
  cat: CatalogCategory,
  title: string,
  description: string,
  indexable = true,
): Metadata {
  return {
    title,
    description,
    keywords: cat.metaKeywords.length > 0 ? cat.metaKeywords : undefined,
    // Index gate (lib/directory/indexGate.ts) can only force index OFF — the
    // admin's robotsIndex/robotsFollow still apply on top.
    robots: { index: indexable && cat.robotsIndex, follow: cat.robotsFollow },
    ...(cat.ogImage
      ? { openGraph: { title, description, images: [{ url: cat.ogImage }] } }
      : {}),
  };
}

/** Parent page /g/{category}/ — tokens stripped, admin canonicalUrl honored. */
export function parentGeoMetadata(cat: CatalogCategory): Metadata {
  const title = renderLocalizedContent(cat.seoTitle || cat.title, {});
  const description = renderLocalizedContent(cat.metaDesc || cat.description, {});
  return {
    ...baseMetadata(cat, title, description),
    alternates: { canonical: cat.canonicalUrl || geoCategoryUrl(cat.slug) },
  };
}

/** Region page /g/{category}/{region}/ — tokens rendered, ALWAYS self-canonical. */
export function regionGeoMetadata(
  cat: CatalogCategory,
  reg: CatalogRegion,
  opts: { indexable?: boolean } = {},
): Metadata {
  const ctx = regionContext(regionDisplayName(reg), reg.slug);
  const title = renderLocalizedContent(cat.seoTitle || `${cat.title} {{in region}}`, ctx);
  const description = renderLocalizedContent(cat.metaDesc || cat.description, ctx);
  return {
    ...baseMetadata(cat, title, description, opts.indexable ?? true),
    alternates: { canonical: geoRegionUrl(cat.slug, reg.slug) },
  };
}

/** Pagination page /g/{category}/{region}/page/{n}/ — self-canonical. */
export function regionPageGeoMetadata(
  cat: CatalogCategory,
  reg: CatalogRegion,
  pageNum: number,
  opts: { indexable?: boolean } = {},
): Metadata {
  const ctx = regionContext(regionDisplayName(reg), reg.slug);
  const base = renderLocalizedContent(cat.seoTitle || `${cat.title} {{in region}}`, ctx);
  const title = `${base} - Page ${pageNum}`;
  const description = renderLocalizedContent(cat.metaDesc || cat.description, ctx);
  return {
    ...baseMetadata(cat, title, description, opts.indexable ?? true),
    alternates: { canonical: geoRegionPageUrl(cat.slug, reg.slug, pageNum) },
  };
}

/** BreadcrumbList JSON-LD: Home › … › current page. */
export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** ItemList JSON-LD for a list of linked entries (e.g. the parent state index). */
export function itemListJsonLd(name: string, description: string, items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

/**
 * Parse admin-authored JSON-LD from the Schema tab. Returns null on empty/invalid
 * input so a bad paste can never break page rendering (the admin form validates too).
 */
export function parseJsonSchema(raw: string | null | undefined): object | null {
  if (!raw?.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Serialize JSON-LD for a <script type="application/ld+json"> tag (safe against `</script>`). */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
