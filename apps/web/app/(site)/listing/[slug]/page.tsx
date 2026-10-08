import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/modules/shared";
import { sanitizeHtml } from "@/lib/style-guide";
import type { Metadata } from "next";

export const revalidate = 0;

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null || value === "") return fallback;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

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
    },
  });

  if (!listing) return { title: "Listing not found" };

  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const jsonLd = generateJsonLd({ ...listing, slug }, siteUrl);

  return {
    title: listing.seoTitle || listing.title,
    description: listing.metaDesc || listing.summary,
    robots: {
      index: listing.robotsIndex && listing.status === "LIVE",
      follow: listing.robotsFollow,
    },
    alternates: listing.canonicalUrl ? { canonical: listing.canonicalUrl } : undefined,
    openGraph: listing.ogImage || listing.avatarImage
      ? {
          title: listing.seoTitle || listing.title,
          description: listing.metaDesc || listing.summary || undefined,
          images: [{ url: `${siteUrl}/api/assets/${listing.ogImage || listing.avatarImage}` }],
        }
      : undefined,
    other: {
      "script:ld+json": JSON.stringify(jsonLd),
    },
  };
}

function getTierBadge(tier: string) {
  const badges: Record<string, { label: string; class: string }> = {
    FREE: { label: "Free", class: "bg-zinc-100 text-zinc-600" },
    STANDARD: { label: "Standard", class: "bg-blue-100 text-blue-700" },
    PREMIUM: { label: "Premium", class: "bg-purple-100 text-purple-700" },
    FEATURED: { label: "Featured", class: "bg-amber-100 text-amber-700" },
    SUPPRESSED: { label: "Suppressed", class: "bg-red-100 text-red-700" },
  };
  return badges[tier] || { label: tier, class: "bg-zinc-100 text-zinc-600" };
}

function getStatusBadge(status: string) {
  const badges: Record<string, { label: string; class: string }> = {
    LIVE: { label: "Live", class: "bg-emerald-100 text-emerald-700" },
    PENDING_REVIEW: { label: "Pending Review", class: "bg-amber-100 text-amber-700" },
    DRAFT: { label: "Draft", class: "bg-zinc-100 text-zinc-600" },
    SUSPENDED: { label: "Suspended", class: "bg-orange-100 text-orange-700" },
    EXPIRED: { label: "Expired", class: "bg-red-100 text-red-700" },
  };
  return badges[status] || { label: status, class: "bg-zinc-100 text-zinc-600" };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

  const listing = await prisma.listing.findUnique({
    where: { slug },
    include: {
      categories: { include: { category: true } },
      regions: true,
      subscription: true,
      reviews: { where: { status: "APPROVED" }, take: 10, orderBy: { createdAt: "desc" } },
    },
  });

  if (!listing) notFound();

  // Increment view count
  await prisma.listing.update({
    where: { id: listing.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  }).catch(() => {});

  const jsonLd = generateJsonLd({ ...listing, slug }, siteUrl);

  const tierBadge = getTierBadge(listing.tier);
  const statusBadge = getStatusBadge(listing.status);
  const hasImages = listing.avatarImage || listing.feedImage || listing.galleryImages;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-900 hover:underline">Home</Link>
        {" / "}
        <Link href={`/g/${listing.categories[0]?.category?.slug}`} className="hover:text-zinc-900 hover:underline">
          {listing.categories[0]?.category?.title}
        </Link>
        {" / "}
        <span className="text-zinc-700">{listing.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero Section */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase ${tierBadge.class}`}>
                    {tierBadge.label}
                  </span>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase ${statusBadge.class}`}>
                    {statusBadge.label}
                  </span>
                  {listing.featuredUntil && new Date(listing.featuredUntil) > new Date() && (
                    <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase text-amber-700">
                      Featured
                    </span>
                  )}
                  {parseJson<unknown[]>(listing.badges, []).length > 0 && (
                    <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-semibold uppercase text-green-700">
                      Verified
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-zinc-900">{listing.title}</h1>
                {listing.companyName && (
                  <p className="mt-1 text-lg text-zinc-600">{listing.companyName}</p>
                )}
              </div>
              {listing.tier === "PREMIUM" && (
                <span className="flex items-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-1.5 text-sm font-semibold text-white">
                  PREMIUM
                </span>
              )}
            </div>

            {/* Contact Info */}
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-zinc-600">
              {listing.phone && (
                <a href={`tel:${listing.phone}`} className="flex items-center gap-1.5 hover:text-zinc-900">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  {listing.phone}
                </a>
              )}
              {listing.email && (
                <a href={`mailto:${listing.email}`} className="flex items-center gap-1.5 hover:text-zinc-900">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {listing.email}
                </a>
              )}
              {listing.website && (
                <a href={listing.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-zinc-900">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Website
                </a>
              )}
            </div>

            {/* Address & Map */}
            {(listing.address || listing.city || listing.state) && (
              <div className="mt-6 flex items-center gap-2 text-sm text-zinc-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>
                  {listing.address ? `${listing.address}, ` : ""}
                  {listing.city ? `${listing.city}, ` : ""}
                  {listing.state} {listing.zip || ""}
                </span>
              </div>
            )}

            {/* Gallery Images */}
            {parseJson<string[]>(listing.galleryImages, []).length > 0 && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                {parseJson<string[]>(listing.galleryImages, []).slice(0, 4).map((img: string, i: number) => (
                  <Image
                    key={i}
                    src={img.startsWith("http") ? img : `${siteUrl}/api/assets/${img}`}
                    alt={`${listing.title} - Gallery ${i + 1}`}
                    width={300}
                    height={200}
                    className="h-32 w-full rounded-lg border border-zinc-200 object-cover"
                  />
                ))}
              </div>
            )}

            {/* Video */}
            {listing.videoUrl && (
              <div className="mt-6 aspect-video w-full rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100">
                <iframe
                  src={listing.videoUrl}
                  title={`${listing.title} - Video`}
                  className="h-full w-full"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          {/* Summary */}
          {listing.summary && (
            <section className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-900">About</h2>
              <p className="mt-3 text-zinc-600">{listing.summary}</p>
            </section>
          )}

          {/* Description */}
          {listing.description && (
            <section className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-900">Description</h2>
              <div className="mt-4 prose prose-zinc max-w-none" dangerouslySetInnerHTML={{ __html: listing.description }} />
            </section>
          )}

          {/* Details Grid */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-zinc-900">Details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-sm text-zinc-500">Categories</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {listing.categories.map((c) => (
                    <Link key={c.category.id} href={`/g/${c.category.slug}`} className="rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-200">
                      {c.category.title}
                    </Link>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Areas Served</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {listing.regions.map((r) => (
                    <span key={r.regionId} className="rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-700">
                      {r.regionId}
                    </span>
                  ))}
                </dd>
              </div>
              {parseJson<string[]>(listing.specialties, []).length > 0 && (
                <div>
                  <dt className="text-sm text-zinc-500">Specialties</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {parseJson<string[]>(listing.specialties, []).map((s: string, i: number) => (
                      <span key={i} className="rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-700">{s}</span>
                    ))}
                  </dd>
                </div>
              )}
              {parseJson<string[]>(listing.amenities, []).length > 0 && (
                <div>
                  <dt className="text-sm text-zinc-500">Amenities</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {parseJson<string[]>(listing.amenities, []).map((a: string, i: number) => (
                      <span key={i} className="rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-700">{a}</span>
                    ))}
                  </dd>
                </div>
              )}
              {parseJson<string[]>(listing.certifications, []).length > 0 && (
                <div>
                  <dt className="text-sm text-zinc-500">Certifications</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {parseJson<string[]>(listing.certifications, []).map((c: string, i: number) => (
                      <span key={i} className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">{c}</span>
                    ))}
                  </dd>
                </div>
              )}
              {parseJson<string[]>(listing.insuranceAccepted, []).length > 0 && (
                <div>
                  <dt className="text-sm text-zinc-500">Insurance</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {parseJson<string[]>(listing.insuranceAccepted, []).map((i: string, idx: number) => (
                      <span key={idx} className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700">{i}</span>
                    ))}
                  </dd>
                </div>
              )}
              {Object.keys(parseJson<Record<string, unknown>>(listing.hoursOfOperation, {})).length > 0 && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-sm text-zinc-500">Hours</dt>
                  <dd className="mt-1 text-sm text-zinc-600">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(parseJson<Record<string, string>>(listing.hoursOfOperation, {}), null, 2)}</pre>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Reviews */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-900">Reviews ({listing.reviewCount})</h2>
              <Link href={`/listing/${slug}/reviews`} className="text-sm text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            {listing.reviews && listing.reviews.length > 0 ? (
              <div className="space-y-4">
                {listing.reviews.map((review) => (
                  <article key={review.id} className="border-t border-zinc-100 pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1 text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className={`h-4 w-4 ${i < review.rating ? "text-amber-500" : "text-zinc-200"}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.78-.57-.38-1.501.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        ))}
                      </div>
                      <span className="text-sm text-zinc-500">{review.authorName || "Anonymous"}</span>
                      <time className="text-xs text-zinc-400 ml-2">{new Date(review.createdAt).toLocaleDateString()}</time>
                    </div>
                    {review.title && <h4 className="font-medium text-zinc-900 mb-1">{review.title}</h4>}
                    <p className="text-zinc-600">{review.content}</p>
                    {review.response && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-green-800">Owner&apos;s Response:</p>
                        <p className="mt-1 text-sm text-green-700">{review.response}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-center py-8">No reviews yet. Be the first to review!</p>
            )}
          </section>

          {/* Write Review Form */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Write a Review</h2>
            <form id="review-form" className="space-y-4">
              <input type="hidden" name="listingId" value={listing.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Your Name</label>
                  <input name="authorName" type="text" required className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                  <input name="authorEmail" type="email" required className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Rating</label>
                <div className="flex items-center gap-2" role="radiogroup">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <label key={star} className="cursor-pointer">
                      <input type="radio" name="rating" value={star} required className="sr-only" />
                      <svg className={`h-8 w-8 transition-colors ${star <= 3 ? "text-amber-500" : "text-zinc-300"}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.78-.57-.38-1.501.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Title</label>
                <input name="title" type="text" className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Your Review</label>
                <textarea name="content" rows={4} required className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <button type="submit" className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
                Submit Review
              </button>
            </form>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Contact / Lead Capture */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Contact This Business</h3>
            <form id="lead-form" className="space-y-4">
              <input type="hidden" name="listingId" value={listing.id} />
              <input type="hidden" name="source" value="listing" />
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Your Name</label>
                <input name="name" type="text" required className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                <input name="email" type="email" required className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Phone</label>
                <input name="phone" type="tel" className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Subject</label>
                <select name="subject" className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="general">General Inquiry</option>
                  <option value="quote">Request Quote</option>
                  <option value="appointment">Schedule Appointment</option>
                  <option value="info">Request Information</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Message</label>
                <textarea name="message" rows={4} required className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <button type="submit" className="w-full rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                Send Message
              </button>
            </form>
            <p className="mt-3 text-xs text-zinc-500 text-center">We&apos;ll never share your information.</p>
          </div>

          {/* Claim Listing */}
          {!listing.claimedById && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Own this business?</h3>
              <p className="text-sm text-zinc-600 mb-4">Claim this listing to manage your profile, respond to reviews, and access analytics.</p>
              <Link href={`/claim/${slug}`} className="block w-full rounded-lg border border-zinc-300 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                Claim This Listing
              </Link>
            </div>
          )}

          {/* Map */}
          {(listing.lat && listing.lng) && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-zinc-900 mb-4">Location</h3>
              <div className="aspect-video w-full rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100">
                <iframe
                  src={`https://maps.google.com/maps?q=${listing.lat},${listing.lng}&z=15&output=embed`}
                  className="h-full w-full"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          )}

          {/* Social Links */}
          {Object.values(parseJson<Record<string, string>>(listing.social, {})).filter(Boolean).length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-zinc-900 mb-4">Connect</h3>
              <div className="flex gap-3">
                {Object.entries(parseJson<Record<string, string>>(listing.social, {})).map(([platform, url]) => (
                  url && (
                    <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-zinc-100 p-2 text-zinc-600 hover:bg-zinc-200">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                    </a>
                  )
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
