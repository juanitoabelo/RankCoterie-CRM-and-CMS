import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma, TENANT_ID } from "@/modules/shared";
import {
  buildListingViewContext,
  type ListingRowLike,
  type RegionRow,
} from "@/components/site/listing/listing-view-model";
import ListingTemplateRenderer from "@/components/site/listing/ListingTemplateRenderer";
import ListingTemplateTreeRenderer from "@/components/site/listing/ListingTemplateTreeRenderer";
import { parseListingTemplateData } from "@/lib/listing-templates/tree-types";
import type { ListingBlock, SidebarWidget } from "@/lib/listing-templates/types";

export const revalidate = 0;

/** Legacy company pages stored file paths ("/img/…") or asset ids — accept both. */
function imgSrc(v: string | null): string {
  if (!v) return "";
  if (v.startsWith("http") || v.startsWith("/")) return v;
  return `/api/assets/${v}`;
}

async function getListing(slug: string) {
  return prisma.listing.findFirst({
    where: { slug, tenantId: TENANT_ID, isLandingPage: true },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      tier: true,
      summary: true,
      description: true,
      staff: true,
      specialties: true,
      keywords: true,
      companyName: true,
      phone: true,
      email: true,
      website: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      avatarImage: true,
      feedImage: true,
      videoUrl: true,
      spiderIgnore: true,
      listingTemplateId: true,
      updatedAt: true,
      categories: { select: { category: { select: { title: true, slug: true } } } },
      regions: { select: { regionId: true } },
    },
  });
}

function stripHtml(html: string | null, max = 160): string {
  if (!html) return "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function CompanyLocationCard({ fullAddress }: { fullAddress: string }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h3 className="mb-2 text-base font-semibold text-zinc-900">Location</h3>
      <p className="text-sm text-zinc-700">{fullAddress}</p>
    </section>
  );
}

/** Lead capture — rendered below either the template or the system layout. */
function CompanyLeadForm({ listingId, slug }: { listingId: string; slug: string }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h3 className="mb-4 text-base font-semibold text-zinc-900">Contact This Business</h3>
      <form method="post" action="/api/leads" className="space-y-3" data-recaptcha>
        <input type="hidden" name="listingId" value={listingId} />
        <input type="hidden" name="source" value="listing" />
        <input type="hidden" name="redirectTo" value={`/LandingPage/${slug}/`} />
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Your Name</label>
          <input
            name="name"
            type="text"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Phone</label>
          <input
            name="phone"
            type="tel"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Message</label>
          <textarea
            name="message"
            rows={4}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          Send Message
        </button>
      </form>
    </section>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(decodeURIComponent(slug));
  if (!listing) return { title: "Company Page Not Found" };
  const name = listing.companyName || listing.title;
  const title = listing.summary ? `${name} — ${listing.summary}` : name;
  const description = listing.summary || stripHtml(listing.description) || undefined;
  const noindex = listing.spiderIgnore || listing.status !== "LIVE";
  return {
    title,
    description,
    keywords: listing.keywords ?? undefined,
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      images: listing.feedImage || listing.avatarImage ? [imgSrc(listing.feedImage || listing.avatarImage)] : undefined,
    },
  };
}

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getListing(decodeURIComponent(slug));
  if (!listing || listing.status !== "LIVE") notFound();

  const name = listing.companyName || listing.title;
  const heroImage = imgSrc(listing.feedImage || listing.avatarImage);
  const specialties = Array.isArray(listing.specialties)
    ? listing.specialties.filter((s): s is string => typeof s === "string")
    : [];
  const location = [listing.city, listing.state].filter(Boolean).join(", ");
  const fullAddress = [listing.address, location, listing.zip].filter(Boolean).join(", ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    description: listing.summary || stripHtml(listing.description, 300) || undefined,
    url: `${process.env.SITE_URL ?? "http://localhost:3000"}/LandingPage/${listing.slug}/`,
    telephone: listing.phone ?? undefined,
    email: listing.email ?? undefined,
    address: listing.address
      ? {
          "@type": "PostalAddress",
          streetAddress: listing.address,
          addressLocality: listing.city ?? undefined,
          addressRegion: listing.state ?? undefined,
          postalCode: listing.zip ?? undefined,
        }
      : undefined,
  };

  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

  // Explicit template assignment only — null keeps the system layout so
  // existing pages never change appearance by side effect.
  const templateRow = listing.listingTemplateId
    ? await prisma.listingTemplate.findUnique({ where: { id: listing.listingTemplateId } })
    : null;
  const parsedTemplate = templateRow ? parseListingTemplateData(templateRow.blocks) : null;
  const templateListing =
    templateRow && parsedTemplate
      ? await prisma.listing.findUnique({
          where: { id: listing.id },
          include: {
            categories: { include: { category: true } },
            regions: true,
            subscription: true,
            reviews: { where: { status: "APPROVED" }, take: 10, orderBy: { createdAt: "desc" } },
            listingTemplate: true,
          },
        })
      : null;
  const regionRows: RegionRow[] = templateListing
    ? ((await prisma.region.findMany({
        where: { id: { in: templateListing.regions.map((r) => r.regionId) } },
        select: { id: true, state: true, stateFull: true, city: true },
      })) as RegionRow[])
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {templateRow && parsedTemplate && templateListing ? (
        /* Admin-chosen template — same pipeline as directory listings. */
        <>
          {parsedTemplate.model === "tree" ? (
            <ListingTemplateTreeRenderer
              blocks={parsedTemplate.blocks as unknown as import("@/lib/page-builder/types").Block[]}
              containerSettings={parsedTemplate.containerSettings}
              listing={{
                id: templateListing.id,
                slug: templateListing.slug,
                title: templateListing.title,
                companyName: templateListing.companyName,
                summary: templateListing.summary,
                description: templateListing.description,
                phone: templateListing.phone,
                email: templateListing.email,
                website: templateListing.website,
                address: templateListing.address,
                city: templateListing.city,
                state: templateListing.state,
                zip: templateListing.zip,
                tier: templateListing.tier,
                status: templateListing.status,
                avatarImage: templateListing.avatarImage,
                feedImage: templateListing.feedImage,
                galleryImages: templateListing.galleryImages,
                videoUrl: templateListing.videoUrl,
                googleMapsUrl: templateListing.googleMapsUrl,
                lat: templateListing.lat,
                lng: templateListing.lng,
                featuredUntil: templateListing.featuredUntil,
                claimedById: templateListing.claimedById,
                badges: templateListing.badges,
                social: templateListing.social,
                specialties: templateListing.specialties,
                amenities: templateListing.amenities,
                certifications: templateListing.certifications,
                insuranceAccepted: templateListing.insuranceAccepted,
                hoursOfOperation: templateListing.hoursOfOperation,
                reviewCount: templateListing.reviewCount,
                averageRating: templateListing.averageRating,
                createdAt: templateListing.createdAt,
                categories: templateListing.categories,
                regions: templateListing.regions,
                reviews: templateListing.reviews,
              }}
              regionRows={regionRows}
              siteUrl={siteUrl}
            />
          ) : (
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
              ctx={buildListingViewContext(
                templateListing as unknown as ListingRowLike,
                regionRows,
                siteUrl,
              )}
            />
          )}

          {/* Lead capture always sits below the template. */}
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {fullAddress && <CompanyLocationCard fullAddress={fullAddress} />}
            <div className={fullAddress ? "lg:col-span-2" : "lg:col-span-3"}>
              <CompanyLeadForm listingId={listing.id} slug={listing.slug} />
            </div>
          </div>
        </>
      ) : (
        <>
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {heroImage && (
          <div className="h-48 w-full bg-zinc-100 sm:h-60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={`${name} cover`}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">{name}</h1>
              {listing.summary && <p className="mt-1 text-zinc-500">{listing.summary}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.tier === "PREMIUM" && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    Premium
                  </span>
                )}
                {listing.categories.map((c) => (
                  <span
                    key={c.category.slug}
                    className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600"
                  >
                    {c.category.title}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {listing.phone && (
                <a
                  href={`tel:${listing.phone}`}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  📞 {listing.phone}
                </a>
              )}
              {listing.website && (
                <a
                  href={listing.website}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Visit Website ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {listing.description && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-semibold text-zinc-900">About {name}</h2>
              <div
                className="prose-custom space-y-3 text-sm leading-6 text-zinc-700"
                dangerouslySetInnerHTML={{ __html: listing.description }}
              />
            </section>
          )}

          {specialties.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-semibold text-zinc-900">Specialties</h2>
              <div className="flex flex-wrap gap-2">
                {specialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}

          {listing.staff && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-semibold text-zinc-900">Staff</h2>
              <div
                className="space-y-2 text-sm leading-6 text-zinc-700"
                dangerouslySetInnerHTML={{ __html: listing.staff }}
              />
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {fullAddress && <CompanyLocationCard fullAddress={fullAddress} />}

          {/* Lead capture */}
          <CompanyLeadForm listingId={listing.id} slug={listing.slug} />
        </div>
      </div>
        </>
      )}
    </main>
  );
}
