/**
 * Listings Module — Table Component
 * 
 * Table displaying listings with actions.
 */
import Link from "next/link";
import { approveListingForm, rejectListingForm } from "../actions";
import { STATUS_BADGE } from "../types";
import type { ListingWithRelations } from "../types";

interface ListingTableProps {
  listings: ListingWithRelations[];
}

export function ListingTable({ listings }: ListingTableProps) {
  if (listings.length === 0) {
    return (
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Listing</th>
              <th className="px-4 py-2.5">Categories</th>
              <th className="px-4 py-2.5">Tier</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Billing</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                No listings found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-2.5">Listing</th>
            <th className="px-4 py-2.5">Categories</th>
            <th className="px-4 py-2.5">Tier</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Billing</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {listings.map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/listings/${l.id}/edit`}
                  className="font-medium text-zinc-900 hover:underline"
                >
                  {l.title}
                </Link>
                <p className="text-xs text-zinc-500">
                  {[l.city, l.state].filter(Boolean).join(", ") || "—"}
                </p>
              </td>
              <td className="px-4 py-3 text-zinc-600">
                {l.categories.map((c) => c.category.title).join(", ") || "—"}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                  {l.tier}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[l.status]}`}>
                  {l.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500">
                {l.subscription?.stripeSubId
                  ? `sub ${l.subscription.stripeSubId.slice(0, 12)}…`
                  : "no subscription"}
                {l.subscription?.currentPeriodEnd
                  ? ` · until ${l.subscription.currentPeriodEnd.toISOString().slice(0, 10)}`
                  : ""}
              </td>
              <td className="px-4 py-3 text-right">
                {l.status === "PENDING_REVIEW" && (
                  <div className="flex justify-end gap-3">
                    <form action={approveListingForm.bind(null, l.id)}>
                      <button
                        type="submit"
                        className="text-xs font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={rejectListingForm.bind(null, l.id)}>
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-600 underline underline-offset-2 hover:text-red-800"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
