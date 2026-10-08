import { prisma } from "@/lib/directory/prismaCatalog";
import { getReviews, getReviewStatuses } from "./actions";
import Link from "next/link";

export const revalidate = 0;

export const metadata = { title: "Reviews | Admin" };

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  FLAGGED: "bg-purple-100 text-purple-700",
};

export default async function ReviewsPage() {
  const [reviews, statuses] = await Promise.all([
    getReviews(),
    getReviewStatuses(),
  ]);

  const statusLabels = Object.fromEntries(statuses.map((s) => [s.value, s.label]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Review Moderation</h1>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="p-3 font-medium text-zinc-500">Review</th>
              <th className="p-3 font-medium text-zinc-500">Listing</th>
              <th className="p-3 font-medium text-zinc-500">Author</th>
              <th className="p-3 font-medium text-zinc-500">Rating</th>
              <th className="p-3 font-medium text-zinc-500">Status</th>
              <th className="p-3 font-medium text-zinc-500">Date</th>
              <th className="p-3 font-medium text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500">
                  No reviews yet.
                </td>
              </tr>
) : (
              <Fragment>
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="p-3">
                      <p className="text-zinc-900 truncate max-w-xs">{r.title || "No title"}</p>
                      <p className="text-xs text-zinc-500 line-clamp-2">{r.content}</p>
                    </td>
                    <td className="p-3">
                      <Link href={`/admin/listings/${r.listing.id}/edit`} className="font-medium text-zinc-900 hover:underline">
                        {r.listing.title}
                      </Link>
                    </td>
                    <td className="p-3 text-zinc-600">{r.authorName || "Anonymous"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className={`h-4 w-4 ${i < r.rating ? "text-amber-500" : "text-zinc-200"}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034a1 1 0 00-1.175 0l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.78-.57-.38-1.501.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" /></svg>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-600">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Link href={`/admin/reviews/${r.id}`} className="text-sm text-blue-600 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </Fragment>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}