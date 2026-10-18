import { notFound } from "next/navigation";
import { prisma } from "@/modules/shared";
import { renderLocalizedContent } from "@/lib/localization/render";
import { parseJson } from "@/lib/listing-templates/render-utils";
import {
  buildListingJsonLd,
  buildListingViewContext,
  type ListingRowLike,
  type RegionRow,
} from "@/components/site/listing/listing-view-model";
import DefaultListingTemplate from "@/components/site/listing/DefaultListingTemplate";
import ListingTemplateRenderer from "@/components/site/listing/ListingTemplateRenderer";
import ListingTemplateTreeRenderer from "@/components/site/listing/ListingTemplateTreeRenderer";
import { parseListingTemplateData } from "@/lib/listing-templates/tree-types";
import type { ListingBlock, SidebarWidget } from "@/lib/listing-templates/types";
import type { Metadata } from "next";

export const revalidate = 0;

type JsonLdListing = {
  title: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  googleMapsUrl?: string | null;
  hoursOfOperation?: unknown;
  pricing?: unknown;
  avatarImage?: string | null;
  reviewCount?: number | null;
  averageRating?: number | null;
  social?: unknown;
};

function generateJsonLd(listing: JsonLdListing, siteUrl: string) {
  const address = {
    "@type": "PostalAddress",
    streetAddress: listing.address,
    addressLocality: listing.city,
    addressRegion: listing.state,
    postalCode: listing.zip,
    addressCountry: "US",
  };

  const geo = listing.lat && listing.lng ? {
    "@type": "GeoCoordinates",
    latitude: listing.lat,
    longitude: listing.lng,
  } : undefined;

  const hours = parseJson<Record<string, { opens?: string; closes?: string } | null> | null>(
    listing.hoursOfOperation,
    null,
  );

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: listing.title,
    url: `${siteUrl}/listing/${listing.slug}`,
    description: listing.summary ?? listing.description,
    telephone: listing.phone,
    email: listing.email,
    address,
    geo,
    hasMap: listing.googleMapsUrl || undefined,
    openingHoursSpecification: hours
      ? Object.entries(hours).map(([day, entry]) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: day.charAt(0).toUpperCase() + day.slice(1),
          opens: entry?.opens,
          closes: entry?.closes,
        }))
      : undefined,
    priceRange: listing.pricing ? "$$" : undefined,
    image: listing.avatarImage ? `${siteUrl}/api/assets/${listing.avatarImage}` : undefined,
    aggregateRating: typeof listing.reviewCount === "number" && listing.reviewCount > 0 ? {
      "@type": "AggregateRating",
      ratingValue: listing.averageRating,
      reviewCount: listing.reviewCount,
    } : undefined,
    sameAs: listing.social
      ? Object.values(parseJson<Record<string, string>>(listing.social, {})).filter(Boolean)
      : undefined,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await prisma.listing.findUnique({
    where: { slug },
    select: {
      title: true,
      summary: true,
      metaDesc: true,
      seoTitle: true,
      avatarImage: true,
      ogImage: true,
      canonicalUrl: true,
      robotsIndex: true,
      robotsFollow: true,
      status: true,
      state: true,
      regions: { select: { regionId: true } },
    },
  });

  if (!listing) return { title: "Listing not found" };

  // Same region preference as the page body: prefer a service region in the
  // listing's own state so {{tokens}} render identically in meta + JSON-LD.
  const regionRows = await prisma.region.findMany({
    where: { id: { in: listing.regions.map((r) => r.regionId) } },
    select: { state: true, stateFull: true, city: true },
  });
  const stateMatches = regionRows.filter((r) => r.state === listing.state);
  const preferred = stateMatches.find((r) => r.city) ?? stateMatches[0] ?? regionRows[0];
  const regionName = preferred
    ? preferred.city
      ? `${preferred.city}, ${preferred.stateFull}`
      : preferred.stateFull
    : null;

  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const renderedSummary = renderLocalizedContent(listing.summary, { regionName });
  const renderedMeta = renderLocalizedContent(listing.metaDesc || listing.summary, { regionName });
  const jsonLd = generateJsonLd({ ...listing, slug, summary: renderedSummary || listing.summary }, siteUrl);

  return {
    title: listing.seoTitle || listing.title,
    description: renderedMeta || undefined,
    robots: {
      index: listing.robotsIndex && listing.status === "LIVE",
      follow: listing.robotsFollow,
    },
    alternates: listing.canonicalUrl ? { canonical: listing.canonicalUrl } : undefined,
    openGraph: listing.ogImage || listing.avatarImage
      ? {
          title: listing.seoTitle || listing.title,
          description: renderedMeta || undefined,
          images: [{ url: `${siteUrl}/api/assets/${listing.ogImage || listing.avatarImage}` }],
        }
      : undefined,
    other: {
      "script:ld+json": JSON.stringify(jsonLd),
    },
  };
}

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lead?: string; leadError?: string }>;
}) {
  const { slug } = await params;
  const { lead, leadError } = await searchParams;
  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

  const listing = await prisma.listing.findUnique({
    where: { slug },
    include: {
      categories: { include: { category: true } },
      regions: true,
      subscription: true,
      reviews: { where: { status: "APPROVED" }, take: 10, orderBy: { createdAt: "desc" } },
      listingTemplate: true,
    },
  });

  if (!listing) notFound();

  // No per-listing template → fall back to the site-wide default template if one is set.
  let templateRow = listing.listingTemplate;
  if (!templateRow) {
    templateRow = await prisma.listingTemplate.findFirst({ where: { isDefault: true } });
  }

  const regionRows = await prisma.region.findMany({
    where: { id: { in: listing.regions.map((r) => r.regionId) } },
    select: { id: true, state: true, stateFull: true, city: true },
  });

  // Increment view count
  await prisma.listing.update({
    where: { id: listing.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  }).catch(() => {});

  const ctx = buildListingViewContext(
    listing as unknown as ListingRowLike,
    regionRows as RegionRow[],
    siteUrl,
  );
  const jsonLd = buildListingJsonLd(ctx);

  const parsedTemplate = templateRow ? parseListingTemplateData(templateRow.blocks) : null;

  return (
    <>
      {lead === "sent" && (
        <div className="mx-auto mt-6 max-w-5xl rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Thanks — your message was sent. This business will get back to you shortly.
        </div>
      )}
      {lead === "error" && (
        <div className="mx-auto mt-6 max-w-5xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {leadError || "Could not send your message. Please try again."}
        </div>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {parsedTemplate?.model === "tree" ? (
        /* Tree-model template: the client renderer rebuilds ctx from serializable
           props (listing rows + region rows + siteUrl) so no functions cross the
           RSC boundary. Relations the template doesn't render are stripped. */
        <ListingTemplateTreeRenderer
          blocks={parsedTemplate.blocks as unknown as import("@/lib/page-builder/types").Block[]}
          containerSettings={parsedTemplate.containerSettings}
          listing={{
            id: listing.id,
            slug: listing.slug,
            title: listing.title,
            companyName: listing.companyName,
            summary: listing.summary,
            description: listing.description,
            phone: listing.phone,
            email: listing.email,
            website: listing.website,
            address: listing.address,
            city: listing.city,
            state: listing.state,
            zip: listing.zip,
            tier: listing.tier,
            status: listing.status,
            avatarImage: listing.avatarImage,
            feedImage: listing.feedImage,
            galleryImages: listing.galleryImages,
            videoUrl: listing.videoUrl,
            googleMapsUrl: listing.googleMapsUrl,
            lat: listing.lat,
            lng: listing.lng,
            featuredUntil: listing.featuredUntil,
            claimedById: listing.claimedById,
            badges: listing.badges,
            social: listing.social,
            specialties: listing.specialties,
            amenities: listing.amenities,
            certifications: listing.certifications,
            insuranceAccepted: listing.insuranceAccepted,
            hoursOfOperation: listing.hoursOfOperation,
            reviewCount: listing.reviewCount,
            averageRating: listing.averageRating,
            createdAt: listing.createdAt,
            categories: listing.categories,
            regions: listing.regions,
            reviews: listing.reviews,
          }}
          regionRows={regionRows as RegionRow[]}
          siteUrl={siteUrl}
        />
      ) : templateRow && parsedTemplate ? (
        <ListingTemplateRenderer
          template={{
            id: templateRow.id,
            name: templateRow.name,
            slug: templateRow.slug,
            layout: templateRow.layout,
            heroVariant: templateRow.heroVariant,
            blocks: parsedTemplate.legacyBlocks as ListingBlock[],
            sidebar: parsedTemplate.legacySidebar as SidebarWidget[],
          }}
          ctx={ctx}
        />
      ) : (
        <DefaultListingTemplate ctx={ctx} />
      )}
    </>
  );
}
