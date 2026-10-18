import Link from "next/link";
import Image from "next/image";
import { sanitizeHtml } from "@/lib/style-guide";
import type { ListingViewContext } from "./listing-view-model";
import {
  AddressLine,
  AreasCard,
  BadgeRow,
  CategoriesCard,
  ClaimCard,
  ContactCard,
  ContactLine,
  DetailsGrid,
  GalleryGrid,
  HoursCard,
  MapEmbed,
  QuickFactsCard,
  ReviewForm,
  ReviewsList,
  SocialCard,
  VideoEmbed,
} from "./parts";

/**
 * System-default single-listing layout (no custom template assigned).
 * Same design that shipped with the original listing page, with a richer
 * sidebar: quick facts, hours, areas served, and categories.
 */
export default function DefaultListingTemplate({ ctx }: { ctx: ListingViewContext }) {
  const { listing } = ctx;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
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
        <div className="space-y-8 lg:col-span-2">
          {/* Hero */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            {listing.feedImage && (
              <div className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                <Image
                  src={`/api/assets/${listing.feedImage}/`}
                  alt={`${listing.title} - Cover`}
                  width={1200}
                  height={400}
                  priority
                  className="h-56 w-full object-cover"
                />
              </div>
            )}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {listing.avatarImage && (
                  <Image
                    src={`/api/assets/${listing.avatarImage}/`}
                    alt={listing.title}
                    width={96}
                    height={96}
                    className="h-20 w-20 shrink-0 rounded-2xl border border-zinc-200 object-cover"
                  />
                )}
                <div>
                  <BadgeRow ctx={ctx} className="mb-3" />
                  <h1 className="text-3xl font-bold text-zinc-900">{listing.title}</h1>
                  {listing.companyName && (
                    <p className="mt-1 text-lg text-zinc-600">{listing.companyName}</p>
                  )}
                </div>
              </div>
              {listing.tier === "PREMIUM" && (
                <span className="flex items-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-1.5 text-sm font-semibold text-white">
                  PREMIUM
                </span>
              )}
            </div>

            {/* Contact Info */}
            <div className="mt-6">
              <ContactLine ctx={ctx} />
            </div>

            {/* Address */}
            <div className="mt-6">
              <AddressLine ctx={ctx} />
            </div>

            {/* Map */}
            <MapEmbed ctx={ctx} className="mt-6" />

            {/* Gallery */}
            <GalleryGrid ctx={ctx} limit={4} className="mt-6" />

            {/* Video */}
            <VideoEmbed ctx={ctx} className="mt-6" />
          </div>

          {/* Summary */}
          {ctx.renderedSummary && (
            <section className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-900">About</h2>
              <p className="mt-3 text-zinc-600">{ctx.renderedSummary}</p>
            </section>
          )}

          {/* Description */}
          {ctx.renderedDescription && (
            <section className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-900">Description</h2>
              <div className="prose prose-zinc mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(ctx.renderedDescription) }} />
            </section>
          )}

          {/* Details Grid */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-zinc-900">Details</h2>
            <div className="mt-4">
              <DetailsGrid ctx={ctx} />
            </div>
          </section>

          {/* Reviews */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Reviews ({listing.reviewCount})</h2>
              <Link href={`/listing/${listing.slug}/reviews`} className="text-sm text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            <ReviewsList ctx={ctx} limit={10} showResponse />
          </section>

          {/* Write Review Form */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Write a Review</h2>
            <ReviewForm ctx={ctx} />
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <ContactCard ctx={ctx} sticky />

          <QuickFactsCard ctx={ctx} />

          <HoursCard ctx={ctx} />

          <AreasCard ctx={ctx} />

          <CategoriesCard ctx={ctx} />

          <ClaimCard ctx={ctx} />

          <SocialCard ctx={ctx} />
        </aside>
      </div>
    </div>
  );
}
