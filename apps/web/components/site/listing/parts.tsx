import Link from "next/link";
import Image from "next/image";
import { sanitizeHtml } from "@/lib/style-guide";
import { formatClock, HOURS_DAYS, HOURS_LABELS } from "@/lib/listing-templates/render-utils";
import type { ListingViewContext } from "./listing-view-model";

/** Badge row: tier, status, featured, verified. */
export function BadgeRow({ ctx, className = "" }: { ctx: ListingViewContext; className?: string }) {
  const { tierBadge, statusBadge, isFeatured, badges } = ctx;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} data-lp-el="badges">
      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase ${tierBadge.class}`}>
        {tierBadge.label}
      </span>
      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase ${statusBadge.class}`}>
        {statusBadge.label}
      </span>
      {isFeatured && (
        <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase text-amber-700">
          Featured
        </span>
      )}
      {badges.length > 0 && (
        <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-semibold uppercase text-green-700">
          Verified
        </span>
      )}
    </div>
  );
}

/** Phone / email / website row. */
export function ContactLine({ ctx }: { ctx: ListingViewContext }) {
  const { listing } = ctx;
  if (!listing.phone && !listing.email && !listing.website) return null;
  return (
    <div className="flex flex-wrap gap-6 text-sm text-zinc-600" data-lp-el="contact">
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
  );
}

/** Address line. */
export function AddressLine({ ctx }: { ctx: ListingViewContext }) {
  const { listing } = ctx;
  if (!listing.address && !listing.city && !listing.state) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600" data-lp-el="address">
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      <span>
        {listing.address ? `${listing.address}, ` : ""}
        {listing.city ? `${listing.city}, ` : ""}
        {listing.state} {listing.zip || ""}
      </span>
    </div>
  );
}

/** Google Maps embed. */
export function MapEmbed({ ctx, className = "" }: { ctx: ListingViewContext; className?: string }) {
  if (!ctx.mapEmbedSrc) return null;
  return (
    <div className={`overflow-hidden rounded-xl border border-zinc-200 ${className}`} data-lp-el="map">
      <iframe
        title={`Map showing the location of ${ctx.listing.title}`}
        src={ctx.mapEmbedSrc}
        className="h-80 w-full border-0"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

/** Video embed (src pre-normalized). */
export function VideoEmbed({ ctx, className = "" }: { ctx: ListingViewContext; className?: string }) {
  if (!ctx.videoSrc) return null;
  return (
    <div className={`aspect-video w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 ${className}`} data-lp-el="video">
      <iframe src={ctx.videoSrc} title={`${ctx.listing.title} - Video`} className="h-full w-full" allowFullScreen />
    </div>
  );
}

/** Gallery grid (asset ids; http URLs pass through). */
export function GalleryGrid({ ctx, limit = 4, className = "" }: { ctx: ListingViewContext; limit?: number; className?: string }) {
  const ids = ctx.galleryIds.slice(0, limit);
  if (ids.length === 0) return null;
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-4 ${className}`} data-lp-el="grid">
      {ids.map((img, i) => (
        <Image
          key={i}
          src={img.startsWith("http") ? img : `/api/assets/${img}/`}
          alt={`${ctx.listing.title} - Gallery ${i + 1}`}
          width={300}
          height={200}
          className="h-32 w-full rounded-lg border border-zinc-200 object-cover" data-lp-el="image"
        />
      ))}
    </div>
  );
}

/** Compact sidebar gallery strip. */
export function GalleryStrip({ ctx, limit = 4 }: { ctx: ListingViewContext; limit?: number }) {
  const ids = ctx.galleryIds.slice(0, limit);
  if (ids.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {ids.map((img, i) => (
        <Image
          key={i}
          src={img.startsWith("http") ? img : `/api/assets/${img}/`}
          alt={`${ctx.listing.title} - ${i + 1}`}
          width={160}
          height={110}
          className="h-20 w-full rounded-md border border-zinc-200 object-cover"
        />
      ))}
    </div>
  );
}

/** Details grid (categories/areas/specialties/amenities/certifications/insurance/hours). */
export function DetailsGrid({ ctx, items }: { ctx: ListingViewContext; items?: string[] }) {
  const want = (k: string) => !items || items.includes(k);
  const { listing, specialties, amenities, certifications, insurance, hours, regionChips } = ctx;
  const hasHours = hours && Object.keys(hours).length > 0;
  const anyContent =
    listing.categories.length > 0 || regionChips.length > 0 ||
    (want("specialties") && specialties.length > 0) ||
    (want("amenities") && amenities.length > 0) ||
    (want("certifications") && certifications.length > 0) ||
    (want("insurance") && insurance.length > 0) ||
    (want("hours") && hasHours);
  if (!anyContent) return null;
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-lp-el="grid">
      {want("categories") && listing.categories.length > 0 && (
        <div data-lp-el="item">
          <dt className="text-sm text-zinc-500">Categories</dt>
          <dd className="mt-1 flex flex-wrap gap-2">
            {listing.categories.map((c) => (
              <Link key={c.category.id} href={`/g/${c.category.slug}`} className="rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-200">
                {c.category.title}
              </Link>
            ))}
          </dd>
        </div>
      )}
      {want("areas") && regionChips.length > 0 && (
        <div data-lp-el="item">
          <dt className="text-sm text-zinc-500">Areas Served</dt>
          <dd className="mt-1 flex flex-wrap gap-2">
            {regionChips.map((r) => (
              <span key={r.id} className="rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-700">{r.label}</span>
            ))}
          </dd>
        </div>
      )}
      {want("specialties") && specialties.length > 0 && (
        <div data-lp-el="item">
          <dt className="text-sm text-zinc-500">Specialties</dt>
          <dd className="mt-1 flex flex-wrap gap-2">
            {specialties.map((s, i) => (<span key={i} className="rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-700">{s}</span>))}
          </dd>
        </div>
      )}
      {want("amenities") && amenities.length > 0 && (
        <div data-lp-el="item">
          <dt className="text-sm text-zinc-500">Amenities</dt>
          <dd className="mt-1 flex flex-wrap gap-2">
            {amenities.map((a, i) => (<span key={i} className="rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-700">{a}</span>))}
          </dd>
        </div>
      )}
      {want("certifications") && certifications.length > 0 && (
        <div data-lp-el="item">
          <dt className="text-sm text-zinc-500">Certifications</dt>
          <dd className="mt-1 flex flex-wrap gap-2">
            {certifications.map((c, i) => (<span key={i} className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">{c}</span>))}
          </dd>
        </div>
      )}
      {want("insurance") && insurance.length > 0 && (
        <div data-lp-el="item">
          <dt className="text-sm text-zinc-500">Insurance</dt>
          <dd className="mt-1 flex flex-wrap gap-2">
            {insurance.map((i, idx) => (<span key={idx} className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700">{i}</span>))}
          </dd>
        </div>
      )}
      {want("hours") && hasHours && (
        <div className="sm:col-span-2 lg:col-span-3" data-lp-el="item">
          <dt className="text-sm text-zinc-500">Hours</dt>
          <dd className="mt-1 text-sm text-zinc-600"><HoursList hours={hours!} /></dd>
        </div>
      )}
    </dl>
  );
}

export function HoursList({ hours }: { hours: Record<string, { opens?: string; closes?: string } | null> }) {
  return (
    <ul className="space-y-1">
      {HOURS_DAYS.map((day) => {
        const entry = hours[day];
        const isOpen = entry && entry.opens && entry.closes && entry.opens !== "00:00" && entry.closes !== "00:00";
        return (
          <li key={day} className="flex justify-between gap-4" data-lp-el="day">
            <span className="capitalize text-zinc-500">{HOURS_LABELS[day]}</span>
            <span className="font-medium">{isOpen ? `${formatClock(entry.opens)} – ${formatClock(entry.closes)}` : "Closed"}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Reviews list (latest approved). */
export function ReviewsList({ ctx, limit = 10, showResponse = true, className = "", style }: { ctx: ListingViewContext; limit?: number; showResponse?: boolean; className?: string; style?: React.CSSProperties }) {
  const reviews = ctx.reviews.slice(0, limit);
  if (reviews.length === 0) {
    return <p className="py-8 text-center text-zinc-500">No reviews yet. Be the first to review!</p>;
  }
  return (
    <div className={`space-y-4 ${className}`} style={style}>
      {reviews.map((review) => (
        <article key={review.id} className="border-t border-zinc-100 pt-4" data-lp-el="item">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className={`h-4 w-4 ${i < review.rating ? "text-amber-500" : "text-zinc-200"}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.78-.57-.38-1.501.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              ))}
            </div>
            <span className="text-sm text-zinc-500">{review.authorName || "Anonymous"}</span>
            <time className="ml-2 text-xs text-zinc-400">{new Date(review.createdAt).toLocaleDateString()}</time>
          </div>
          {review.title && <h4 className="mb-1 font-medium text-zinc-900">{review.title}</h4>}
          <p className="text-zinc-600">{review.content}</p>
          {showResponse && review.response && (
            <div className="mt-3 rounded-lg bg-green-50 p-3">
              <p className="text-sm font-medium text-green-800">Owner&apos;s Response:</p>
              <p className="mt-1 text-sm text-green-700">{review.response}</p>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

/** Write-a-review form. */
export function ReviewForm({ ctx, className = "", style }: { ctx: ListingViewContext; className?: string; style?: React.CSSProperties }) {
  const hasStyle = style && Object.keys(style).length > 0;
  return (
    <form id="review-form" className={`space-y-4 ${className}`} data-lp-el="form" {...(hasStyle ? { style } : {})} data-lpignore="true" suppressHydrationWarning>
      <input type="hidden" name="listingId" value={ctx.listing.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Your Name</label>
          <input name="authorName" type="text" required className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
          <input name="authorEmail" type="email" required className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">Rating</label>
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
        <label className="mb-1 block text-sm font-medium text-zinc-700">Title</label>
        <input name="title" type="text" className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">Your Review</label>
        <textarea name="content" rows={4} required className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
      </div>
      <button type="submit" className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-700" data-lp-el="button">
        Submit Review
      </button>
    </form>
  );
}

/** Lead-capture contact form with listingId wired. */
export function ContactCard({ ctx, title = "Contact This Business", sticky = false, className = "", style }: { ctx: ListingViewContext; title?: string; sticky?: boolean; className?: string; style?: React.CSSProperties }) {
  const { listing } = ctx;
  const hasStyle = style && Object.keys(style).length > 0;
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-6 ${sticky ? "sticky top-24" : ""} ${className}`} {...(hasStyle ? { style } : {})}>
      <h3 className="mb-4 text-lg font-semibold text-zinc-900" data-lp-el="heading">{title}</h3>
      <form id="lead-form" data-lp-el="form" method="post" action="/api/leads" className="space-y-4" data-lpignore="true" suppressHydrationWarning>
        <input type="hidden" name="listingId" value={listing.id} />
        <input type="hidden" name="source" value="listing" />
        <input type="hidden" name="redirectTo" value={`/listing/${listing.slug}`} />
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Your Name</label>
          <input name="name" type="text" required className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
          <input name="email" type="email" required className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Phone</label>
          <input name="phone" type="tel" className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Subject</label>
          <select name="subject" className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
            <option value="general">General Inquiry</option>
            <option value="quote">Request Quote</option>
            <option value="appointment">Schedule Appointment</option>
            <option value="info">Request Information</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Message</label>
          <textarea name="message" rows={4} required className="w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" className="w-full rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700" data-lp-el="button">
          Send Message
        </button>
      </form>
      <p className="mt-3 text-center text-xs text-zinc-500">We&apos;ll never share your information.</p>
    </div>
  );
}

/** Claim-this-listing card (hidden when claimed). */
export function ClaimCard({ ctx, className = "", style }: { ctx: ListingViewContext; className?: string; style?: React.CSSProperties }) {
  if (ctx.listing.claimedById) return null;
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-6 ${className}`} style={style}>
      <h3 className="mb-2 text-lg font-semibold text-zinc-900" data-lp-el="heading">Own this business?</h3>
      <p className="mb-4 text-sm text-zinc-600" data-lp-el="body">Claim this listing to manage your profile, respond to reviews, and access analytics.</p>
      <Link href={`/claim/${ctx.listing.slug}`} className="block w-full rounded-lg border border-zinc-300 bg-white px-6 py-2.5 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50" data-lp-el="button">
        Claim This Listing
      </Link>
    </div>
  );
}

/** Social links card. */
export function SocialCard({ ctx, title = "Connect", className = "", style }: { ctx: ListingViewContext; title?: string; className?: string; style?: React.CSSProperties }) {
  const entries = Object.entries(ctx.social).filter(([, url]) => Boolean(url));
  if (entries.length === 0) return null;
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-6 ${className}`} style={style}>
      <h3 className="mb-4 text-lg font-semibold text-zinc-900" data-lp-el="heading">{title}</h3>
      <div className="flex gap-3">
        {entries.map(([platform, url]) => (
          <a key={platform} href={url} target="_blank" rel="noopener noreferrer" aria-label={platform} className="rounded-lg bg-zinc-100 p-2 text-zinc-600 hover:bg-zinc-200" data-lp-el="link">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" /></svg>
          </a>
        ))}
      </div>
    </div>
  );
}

/** Quick facts card (tier, rating, verified, member since). */
export function QuickFactsCard({ ctx, className = "", style }: { ctx: ListingViewContext; className?: string; style?: React.CSSProperties }) {
  const { listing, tierBadge } = ctx;
  const joined = listing.createdAt ? new Date(listing.createdAt) : null;
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-6 ${className}`} style={style}>
      <h3 className="mb-4 text-lg font-semibold text-zinc-900" data-lp-el="heading">Quick Facts</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3" data-lp-el="item">
          <dt className="text-zinc-500">Plan</dt>
          <dd><span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase ${tierBadge.class}`}>{tierBadge.label}</span></dd>
        </div>
        {typeof listing.reviewCount === "number" && listing.reviewCount > 0 && (
          <div className="flex justify-between gap-3" data-lp-el="item">
            <dt className="text-zinc-500">Rating</dt>
            <dd className="flex items-center gap-1 font-medium text-zinc-900">
              <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.78-.57-.38-1.501.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              {listing.averageRating} ({listing.reviewCount})
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-3" data-lp-el="item">
          <dt className="text-zinc-500">Verified</dt>
          <dd className="font-medium text-zinc-900">{ctx.badges.length > 0 ? "Yes" : "—"}</dd>
        </div>
        {joined && (
          <div className="flex justify-between gap-3" data-lp-el="item">
            <dt className="text-zinc-500">Member since</dt>
            <dd className="font-medium text-zinc-900">{joined.toLocaleDateString(undefined, { month: "short", year: "numeric" })}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/** Hours card (compact). */
export function HoursCard({ ctx, title = "Hours", className = "", style }: { ctx: ListingViewContext; title?: string; className?: string; style?: React.CSSProperties }) {
  if (!ctx.hours || Object.keys(ctx.hours).length === 0) return null;
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-6 ${className}`} style={style}>
      <h3 className="mb-4 text-lg font-semibold text-zinc-900" data-lp-el="heading">{title}</h3>
      <HoursList hours={ctx.hours} />
    </div>
  );
}

/** Areas-served chips card. */
export function AreasCard({ ctx, title = "Areas Served", className = "", style }: { ctx: ListingViewContext; title?: string; className?: string; style?: React.CSSProperties }) {
  if (ctx.regionChips.length === 0) return null;
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-6 ${className}`} style={style}>
      <h3 className="mb-4 text-lg font-semibold text-zinc-900" data-lp-el="heading">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {ctx.regionChips.map((r) => (
          <span key={r.id} className="rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-700" data-lp-el="chip">{r.label}</span>
        ))}
      </div>
    </div>
  );
}

/** Categories chips card. */
export function CategoriesCard({ ctx, title = "Categories", className = "", style }: { ctx: ListingViewContext; title?: string; className?: string; style?: React.CSSProperties }) {
  if (ctx.listing.categories.length === 0) return null;
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-6 ${className}`} style={style}>
      <h3 className="mb-4 text-lg font-semibold text-zinc-900" data-lp-el="heading">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {ctx.listing.categories.map((c) => (
          <Link key={c.category.id} href={`/g/${c.category.slug}`} className="rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-200" data-lp-el="chip">
            {c.category.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Token-bound custom text card (sidebar). */
export function TextCard({ title, html }: { title?: string; html: string }) {
  if (!html.trim()) return null;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      {title && <h3 className="mb-3 text-lg font-semibold text-zinc-900">{title}</h3>}
      <div className="prose prose-sm prose-zinc max-w-none text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
    </div>
  );
}
