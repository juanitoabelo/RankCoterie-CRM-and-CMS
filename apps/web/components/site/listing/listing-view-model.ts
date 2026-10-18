import { renderLocalizedContent } from "@/lib/localization/render";
import {
  getStatusBadge,
  getTierBadge,
  googleMapsEmbedSrc,
  parseGalleryIds,
  parseJson,
  videoEmbedSrc,
} from "@/lib/listing-templates/render-utils";
import {
  bindListingTokens,
  listingRegionContext,
  type ListingTokenContext,
} from "@/lib/listing-templates/tokens";

/**
 * Everything a single-listing template needs, derived once per request.
 * The default template and custom ListingTemplate templates both render
 * from this view-model, so data binding stays identical across layouts.
 */

export interface ListingCategoryRef {
  category: { id: string; title: string; slug: string };
}

export interface ListingReviewRef {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  response: string | null;
  authorName: string | null;
  createdAt: Date | string;
}

/** Loose structural shape of the listing row the templates render. */
export interface ListingRowLike {
  id: string;
  slug: string;
  title: string;
  companyName: string | null;
  summary: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  tier: string;
  status: string;
  avatarImage: string | null;
  feedImage: string | null;
  galleryImages: unknown;
  videoUrl: string | null;
  googleMapsUrl: string | null;
  lat: number | null;
  lng: number | null;
  featuredUntil: Date | string | null;
  claimedById: string | null;
  badges: unknown;
  social: unknown;
  specialties: unknown;
  amenities: unknown;
  certifications: unknown;
  insuranceAccepted: unknown;
  hoursOfOperation: unknown;
  pricing?: unknown;
  reviewCount: number;
  averageRating: number;
  createdAt: Date | string;
  categories: ListingCategoryRef[];
  regions: Array<{ regionId: string }>;
  reviews: ListingReviewRef[];
}

export interface RegionRow {
  id: string;
  state: string | null;
  stateFull: string | null;
  city: string | null;
}

export interface ListingViewContext {
  listing: ListingRowLike;
  siteUrl: string;
  galleryIds: string[];
  mapEmbedSrc: string | null;
  videoSrc: string | null;
  reviews: ListingReviewRef[];
  hours: Record<string, { opens?: string; closes?: string } | null> | null;
  social: Record<string, string>;
  badges: unknown[];
  specialties: string[];
  amenities: string[];
  certifications: string[];
  insurance: string[];
  regionChips: Array<{ id: string; label: string }>;
  regionName: string | null;
  categoryName: string | null;
  renderedSummary: string;
  renderedDescription: string;
  tierBadge: { label: string; class: string };
  statusBadge: { label: string; class: string };
  isFeatured: boolean;
  tokens: ListingTokenContext;
  /** Token-bound convenience: bind text against this listing. */
  bind: (text: string | null | undefined) => string;
}

export function buildListingViewContext(
  listing: ListingRowLike,
  regionRows: RegionRow[],
  siteUrl?: string,
): ListingViewContext {
  const url = siteUrl ?? (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

  const regionLabels = new Map(
    regionRows.map((r) => [r.id, r.city ? `${r.city}, ${r.stateFull}` : r.stateFull ?? r.id]),
  );
  const regionChips = listing.regions
    .map((r) => ({ id: r.regionId, label: regionLabels.get(r.regionId) ?? r.regionId }))
    .filter((r) => Boolean(r.label));

  // Prefer a service region in the listing's own state so {{tokens}} render
  // consistently in body, meta, and JSON-LD.
  const stateMatches = regionRows.filter((r) => r.state === listing.state);
  const firstRegion = stateMatches.find((r) => r.city) ?? stateMatches[0] ?? regionRows[0];
  const regionName = firstRegion
    ? firstRegion.city
      ? `${firstRegion.city}, ${firstRegion.stateFull}`
      : firstRegion.stateFull
    : null;
  const categoryName = listing.categories[0]?.category?.title ?? null;

  const region = listingRegionContext(
    {
      region: regionName,
    },
    categoryName,
  );
  region.regionName = regionName;
  region.categoryName = categoryName ?? undefined;

  const tokenSource = {
    title: listing.title,
    companyName: listing.companyName,
    slug: listing.slug,
    summary: listing.summary,
    description: listing.description,
    phone: listing.phone,
    email: listing.email,
    website: listing.website,
    address: listing.address,
    city: listing.city,
    state: listing.state,
    zip: listing.zip,
    category: categoryName,
    region: regionName,
    tier: listing.tier,
    status: listing.status,
    averageRating: listing.averageRating,
    reviewCount: listing.reviewCount,
  };
  const tokens: ListingTokenContext = { listing: tokenSource, region };
  const bind = (text: string | null | undefined) => bindListingTokens(text, tokens);

  const summarySource = listing.summary ?? "";
  const renderedSummary =
    bind(summarySource) || renderLocalizedContent(summarySource, { regionName });

  return {
    listing,
    siteUrl: url,
    galleryIds: parseGalleryIds(listing.galleryImages),
    mapEmbedSrc: googleMapsEmbedSrc(listing.googleMapsUrl, listing.lat, listing.lng),
    videoSrc: videoEmbedSrc(listing.videoUrl),
    reviews: listing.reviews ?? [],
    hours: parseJson<Record<string, { opens?: string; closes?: string } | null> | null>(listing.hoursOfOperation, null),
    social: parseJson<Record<string, string>>(listing.social, {}),
    badges: parseJson<unknown[]>(listing.badges, []),
    specialties: parseJson<string[]>(listing.specialties, []),
    amenities: parseJson<string[]>(listing.amenities, []),
    certifications: parseJson<string[]>(listing.certifications, []),
    insurance: parseJson<string[]>(listing.insuranceAccepted, []),
    regionChips,
    regionName,
    categoryName,
    renderedSummary,
    renderedDescription: bind(listing.description ?? "") || renderLocalizedContent(listing.description, { regionName }),
    tierBadge: getTierBadge(listing.tier),
    statusBadge: getStatusBadge(listing.status),
    isFeatured: Boolean(listing.featuredUntil && new Date(listing.featuredUntil) > new Date()),
    tokens,
    bind,
  };
}

/** JSON-LD for the listing (shared by all templates). */
export function buildListingJsonLd(ctx: ListingViewContext) {
  const { listing } = ctx;
  const geo = listing.lat && listing.lng
    ? { "@type": "GeoCoordinates", latitude: listing.lat, longitude: listing.lng }
    : undefined;
  const socialUrls = Object.values(ctx.social).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: listing.title,
    url: `${ctx.siteUrl}/listing/${listing.slug}`,
    description: ctx.renderedSummary || listing.summary || listing.description,
    telephone: listing.phone,
    email: listing.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.address,
      addressLocality: listing.city,
      addressRegion: listing.state,
      postalCode: listing.zip,
      addressCountry: "US",
    },
    geo,
    hasMap: listing.googleMapsUrl || undefined,
    openingHoursSpecification: ctx.hours
      ? Object.entries(ctx.hours).map(([day, entry]) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: day.charAt(0).toUpperCase() + day.slice(1),
          opens: entry?.opens,
          closes: entry?.closes,
        }))
      : undefined,
    priceRange: listing.pricing ? "$$" : undefined,
    image: listing.avatarImage ? `${ctx.siteUrl}/api/assets/${listing.avatarImage}` : undefined,
    aggregateRating: listing.reviewCount > 0
      ? { "@type": "AggregateRating", ratingValue: listing.averageRating, reviewCount: listing.reviewCount }
      : undefined,
    sameAs: socialUrls.length > 0 ? socialUrls : undefined,
  };
}
