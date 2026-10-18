import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/modules/shared";

export const revalidate = 0;

const PAGE_SIZE = 10;

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${star <= rating ? "text-amber-500" : "text-zinc-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.78-.57-.38-1.501.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default async function ListingReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const listing = await prisma.listing.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      reviewCount: true,
      averageRating: true,
      categories: { select: { category: { select: { slug: true, title: true } } }, take: 1 },
    },
  });

  if (!listing) notFound();

  const where = { listingId: listing.id, status: "APPROVED" } as const;
  const [totalCount, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const category = listing.categories[0]?.category;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-900 hover:underline">Home</Link>
        {" / "}
        {category && (
          <>
            <Link href={`/g/${category.slug}`} className="hover:text-zinc-900 hover:underline">
              {category.title}
            </Link>
            {" / "}
          </>
        )}
        <Link href={`/listing/${listing.slug}/`} className="hover:text-zinc-900 hover:underline">
          {listing.title}
        </Link>
        {" / "}
        <span className="text-zinc-700">Reviews</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Reviews for {listing.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-zinc-600">
            {listing.reviewCount > 0 && <StarRow rating={Math.round(listing.averageRating)} />}
            <span>
              {listing.averageRating > 0 ? listing.averageRating.toFixed(1) : "No rating"} ·{" "}
              {totalCount} review{totalCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <Link
          href={`/listing/${listing.slug}/`}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          ← Back to listing
        </Link>
      </div>

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-zinc-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-2">
                <StarRow rating={review.rating} />
                <span className="text-sm font-medium text-zinc-700">{review.authorName || "Anonymous"}</span>
                <time className="text-xs text-zinc-400">{new Date(review.createdAt).toLocaleDateString()}</time>
                {review.isVerified && (
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-green-700">
                    Verified
                  </span>
                )}
              </div>
              {review.title && <h2 className="font-semibold text-zinc-900 mb-1">{review.title}</h2>}
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
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center">
          <p className="text-zinc-500">No reviews yet. Be the first to review this listing!</p>
          <Link
            href={`/listing/${listing.slug}/#review-form`}
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Write a Review
          </Link>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-between text-sm" aria-label="Reviews pagination">
          {page > 1 ? (
            <Link
              href={`/listing/${listing.slug}/reviews/?page=${page - 1}`}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50"
            >
              ← Newer reviews
            </Link>
          ) : (
            <span />
          )}
          <span className="text-zinc-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/listing/${listing.slug}/reviews/?page=${page + 1}`}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Older reviews →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
