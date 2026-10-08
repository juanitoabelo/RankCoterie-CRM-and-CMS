import { prisma } from "@/lib/directory/prismaCatalog";
import { getVerificationRequests, getVerificationTypes, getVerificationStatuses } from "../actions";
import Link from "next/link";

export const revalidate = 0;

export const metadata = { title: "Verification Requests | Admin" };

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  IN_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-zinc-100 text-zinc-700",
};

const typeLabels: Record<string, string> = {
  EMAIL: "Email",
  PHONE: "Phone",
  LICENSE: "License",
  IDENTITY: "Identity",
  BUSINESS_LICENSE: "Business License",
  INSURANCE: "Insurance",
};

export default async function VerificationRequestsPage() {
  const [requests, types, statuses] = await Promise.all([
    getVerificationRequests(),
    getVerificationTypes(),
    getVerificationStatuses(),
  ]);

  const typeLabels = Object.fromEntries(types.map((t) => [t.value, t.label]));
  const statusLabels = Object.fromEntries(statuses.map((s) => [s.value, s.label]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Verification Requests</h1>
          <p className="text-zinc-500 mt-1">Manage and review verification requests</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="p-3 font-medium text-zinc-500">Request</th>
              <th className="p-3 font-medium text-zinc-500">Listing</th>
              <th className="p-3 font-medium text-zinc-500">Type</th>
              <th className="p-3 font-medium text-zinc-500">Status</th>
              <th className="p-3 font-medium text-zinc-500">Requested By</th>
              <th className="p-3 font-medium text-zinc-500">Created</th>
              <th className="p-3 font-medium text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500">
                  No verification requests yet.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className="p-3">
                    <p className="font-medium text-zinc-900">{r.id.slice(0, 8)}...</p>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-zinc-900">{r.listing?.title}</p>
                    <p className="text-xs text-zinc-500">{r.listing?.slug}</p>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                      {typeLabels[r.type] ?? r.type}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                      {statusLabels[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-600">
                    {r.requestedBy?.email || "Unknown"}
                  </td>
                  <td className="p-3 text-zinc-600">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/verification/${r.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
