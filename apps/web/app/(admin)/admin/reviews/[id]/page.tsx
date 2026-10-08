import { prisma } from "@/lib/directory/prismaCatalog";
import { getReview, getReviewStatuses } from "../actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export const revalidate = 0;

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const review = await getReview(id);

  if (!review) notFound();

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    FLAGGED: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin/reviews" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Reviews
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900 flex items-center gap-3">
            Review Moderation
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[review.status] ?? "bg-zinc-100 text-zinc-700"}`}>
              {review.status}
            </span>
          </h1>
          <p className="text-zinc-500 mt-1">Review for: {review.listing.title}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Review Content */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">Review Content</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">Rating</label>
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`h-5 w-5 ${i < review.rating ? "text-amber-500" : "text-zinc-200"}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.78-.57-.38-1.501.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" /></svg>
                  ))}
                </div>
              </div>
              {review.title && (
                <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-1">Title</label>
                  <p className="font-medium text-zinc-900">{review.title}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">Content</label>
                <p className="text-zinc-600 whitespace-pre-wrap">{review.content}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">Author</label>
                <p className="text-zinc-600">{review.authorName || "Anonymous"} {review.authorEmail && `(${review.authorEmail})`}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">Verified</label>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${review.isVerified ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"}`}>
                  {review.isVerified ? "Verified" : "Not Verified"}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">Created</label>
                <p className="text-zinc-600">{new Date(review.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </section>

          {/* Owner Response */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">Owner Response</h2>
            {review.response ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-green-700">Owner Response</span>
                  <time className="text-xs text-zinc-500">{review.respondedAt ? new Date(review.respondedAt).toLocaleString() : ""}</time>
                </div>
                <p className="text-green-700 whitespace-pre-wrap">{review.response}</p>
              </div>
            ) : (
              <form action="/api/admin/reviews" method="POST" className="space-y-3">
                <input type="hidden" name="id" value={review.id} />
                <input type="hidden" name="status" value="APPROVED" />
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Write Response</label>
                  <textarea name="response" rows={4} required className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Write your response to this review..." />
                </div>
                <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                  Submit Response & Approve
                </button>
              </form>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Actions</h3>
            <div className="space-y-3">
              <form action="/api/admin/reviews" method="POST">
                <input type="hidden" name="id" value={review.id} />
                <input type="hidden" name="status" value="APPROVED" />
                <button type="submit" className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700">
                  Approve
                </button>
              </form>
              <form action="/api/admin/reviews" method="POST">
                <input type="hidden" name="id" value={review.id} />
                <input type="hidden" name="status" value="REJECTED" />
                <button type="submit" className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">
                  Reject
                </button>
              </form>
              <form action="/api/admin/reviews" method="POST">
                <input type="hidden" name="id" value={review.id} />
                <input type="hidden" name="status" value="FLAGGED" />
                <button type="submit" className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                  Flag as Spam/Inappropriate
                </button>
              </form>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Listing Info</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Title:</strong> {review.listing.title}</p>
              <p><strong>Tier:</strong> {review.listing.tier}</p>
              <p><strong>Status:</strong> {review.listing.status}</p>
              <Link href={`/admin/listings/${review.listing.id}/edit`} target="_blank" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.068 7-9.542 7-4.477 0-8.268-2.943-9.542 7z" /></svg>
                Edit Listing
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Listing URL</h3>
            <Link href={`/listing/${review.listing.slug}`} target="_blank" className="text-blue-600 hover:underline">
              View Public Listing →
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  FLAGGED: "bg-purple-100 text-purple-700",
};