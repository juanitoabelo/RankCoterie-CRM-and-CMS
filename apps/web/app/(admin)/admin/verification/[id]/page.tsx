import { prisma } from "@/lib/directory/prismaCatalog";
import { getVerificationRequest, getVerificationTypes, getVerificationStatuses } from "../actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export const revalidate = 0;

export default async function VerificationRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getVerificationRequest(id);

  if (!request) notFound();

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    IN_REVIEW: "bg-blue-100 text-blue-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    EXPIRED: "bg-zinc-100 text-zinc-700",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin/verification" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Verification Requests
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900 flex items-center gap-3">
            Verification Request
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[request.status] ?? "bg-zinc-100 text-zinc-700"}`}>
              {request.status}
            </span>
          </h1>
          <p className="text-zinc-500 mt-1">Type: {request.type} | ID: {request.id.slice(0, 8)}...</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">Request Details</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-zinc-500">Type</dt>
                <dd className="mt-1 font-medium text-zinc-900">{request.type}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[request.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                    {request.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Listing</dt>
                <dd className="mt-1">
                  <Link href={`/admin/listings/${request.listing.id}/edit`} className="font-medium text-zinc-900 hover:underline">
                    {request.listing.title}
                  </Link>
                  <p className="text-xs text-zinc-500">{request.listing.slug}</p>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Requested By</dt>
                <dd className="mt-1 text-zinc-600">{request.requestedBy?.email || "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Created</dt>
                <dd className="mt-1 text-zinc-600">{new Date(request.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Reviewed</dt>
                <dd className="mt-1 text-zinc-600">
                  {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : "Not reviewed"}
                  {request.reviewedBy && <span className="ml-2 text-xs text-zinc-500">by {request.reviewedBy.email}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Document Type</dt>
                <dd className="mt-1 text-zinc-600">{request.documentType || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Document Number</dt>
                <dd className="mt-1 text-zinc-600 font-mono">{request.documentNumber || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Expiration</dt>
                <dd className="mt-1 text-zinc-600">
                  {request.expirationDate ? new Date(request.expirationDate).toLocaleDateString() : "—"}
                </dd>
              </div>
            </dl>
          </section>

          {/* Document Preview */}
          {request.documentUrl && (
            <section className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Document Preview</h2>
              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                {request.documentUrl.endsWith(".pdf") ? (
                  <iframe
                    src={request.documentUrl}
                    className="w-full h-96 rounded-lg"
                    title="Document preview"
                  />
                ) : (
                  <img
                    src={request.documentUrl}
                    alt="Verification document"
                    className="max-w-full h-auto rounded-lg"
                  />
                )}
              </div>
            </section>
          )}

          {/* Rejection Reason */}
          {request.rejectionReason && (
            <section className="rounded-xl border border-red-200 bg-red-50 p-6">
              <h2 className="text-lg font-semibold text-red-700 mb-2">Rejection Reason</h2>
              <p className="text-red-600">{request.rejectionReason}</p>
            </section>
          )}

          {/* Meta */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Metadata</h2>
            <pre className="bg-zinc-100 rounded-lg p-4 text-xs overflow-auto max-h-64">
              {JSON.stringify(request.metadata, null, 2)}
            </pre>
          </section>
        </div>

        {/* Sidebar - Actions */}
        <aside className="space-y-6">
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Actions</h3>
            <div className="space-y-3">
              <form action="/api/admin/verification" method="POST">
                <input type="hidden" name="id" value={request.id} />
                <input type="hidden" name="status" value="APPROVED" />
                <button
                  type="submit"
                  disabled={request.status === "APPROVED"}
                  className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Approve Verification
                </button>
              </form>

              <form action="/api/admin/verification" method="POST">
                <input type="hidden" name="id" value={request.id} />
                <input type="hidden" name="status" value="REJECTED" />
                <div className="space-y-2">
                  <textarea
                    name="rejectionReason"
                    rows={3}
                    placeholder="Reason for rejection..."
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={request.status === "REJECTED"}
                    className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject Verification
                  </button>
                </div>
              </form>

              <form action="/api/admin/verification" method="POST">
                <input type="hidden" name="id" value={request.id} />
                <input type="hidden" name="status" value="IN_REVIEW" />
                <button
                  type="submit"
                  disabled={request.status === "IN_REVIEW"}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Mark In Review
                </button>
              </form>
            </div>
          </section>

          {/* Listing Info */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Listing Info</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Title:</strong> {request.listing.title}</p>
              <p><strong>Slug:</strong> {request.listing.slug}</p>
              <p><strong>Company:</strong> {request.listing.companyName || "—"}</p>
              <p><strong>Email:</strong> {request.listing.email || "—"}</p>
              <p><strong>Phone:</strong> {request.listing.phone || "—"}</p>
              <Link
                href={`/admin/listings/${request.listing.id}/edit`}
                target="_blank"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.068 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                Edit Listing
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  IN_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-zinc-100 text-zinc-700",
};