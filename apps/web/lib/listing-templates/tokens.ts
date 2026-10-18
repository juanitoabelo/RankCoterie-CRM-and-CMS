import { regionContext, renderLocalizedContent, type RegionContext } from "@/lib/localization/render";

/**
 * Data-binding for custom single-listing templates.
 *
 * Two layers, applied in order:
 *  1. Listing-field tokens: {{title}}, {{phone}}… resolved from this listing.
 *  2. Localization tokens: {{in region}}, {{catName}}… via renderLocalizedContent.
 *
 * Unresolvable tokens are stripped (same behavior as the localization layer),
 * so a template can safely use {{city}} even when the field is empty.
 */

export interface ListingTokenSource {
  title?: string | null;
  companyName?: string | null;
  slug?: string | null;
  summary?: string | null;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  category?: string | null;
  region?: string | null;
  tier?: string | null;
  status?: string | null;
  averageRating?: number | null;
  reviewCount?: number | null;
}

export interface ListingTokenContext {
  listing: ListingTokenSource;
  /** Region/category context for localization tokens. */
  region: RegionContext;
}

const FIELD_TOKENS = [
  "title",
  "companyName",
  "slug",
  "summary",
  "description",
  "phone",
  "email",
  "website",
  "address",
  "city",
  "state",
  "zip",
  "country",
  "category",
  "region",
  "tier",
  "status",
] as const;

type FieldToken = (typeof FIELD_TOKENS)[number];

function fieldValues(listing: ListingTokenSource): Record<FieldToken, string> {
  return {
    title: (listing.title ?? "").trim(),
    companyName: (listing.companyName ?? listing.title ?? "").trim(),
    slug: (listing.slug ?? "").trim(),
    summary: (listing.summary ?? "").trim(),
    description: (listing.description ?? "").trim(),
    phone: (listing.phone ?? "").trim(),
    email: (listing.email ?? "").trim(),
    website: (listing.website ?? "").trim(),
    address: (listing.address ?? "").trim(),
    city: (listing.city ?? "").trim(),
    state: (listing.state ?? "").trim(),
    zip: (listing.zip ?? "").trim(),
    country: (listing.country ?? "").trim(),
    category: (listing.category ?? "").trim(),
    region: (listing.region ?? "").trim(),
    tier: (listing.tier ?? "").trim(),
    status: (listing.status ?? "").trim(),
  };
}

/** Resolve listing-field tokens, then localization tokens. Safe for null/empty fields. */
export function bindListingTokens(
  text: string | null | undefined,
  ctx: ListingTokenContext,
): string {
  if (!text) return "";
  let out = text;
  const values = fieldValues(ctx.listing);
  for (const token of FIELD_TOKENS) {
    const value = values[token];
    out = out.replaceAll(`{{${token}}}`, value);
  }
  // Numbered/rating tokens
  out = out.replaceAll("{{rating}}", ctx.listing.averageRating ? String(ctx.listing.averageRating) : "");
  out = out.replaceAll("{{reviewCount}}", ctx.listing.reviewCount ? String(ctx.listing.reviewCount) : "");
  // Localization tokens ({{in region}}, {{catName}}…) resolve second; they strip
  // themselves when no region/category context applies.
  return renderLocalizedContent(out, ctx.region).trim();
}

/** Token-bind an href; empty result means the target is missing. */
export function bindListingHref(
  text: string | null | undefined,
  ctx: ListingTokenContext,
): string {
  const bound = bindListingTokens(text, ctx);
  return bound;
}

export function listingRegionContext(
  listing: ListingTokenSource,
  categoryName?: string | null,
): RegionContext {
  const base = regionContext(listing.region ?? null, undefined);
  if (categoryName) base.categoryName = categoryName;
  return base;
}
