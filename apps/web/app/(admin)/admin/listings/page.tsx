import Link from "next/link";
import { prisma } from "@/lib/directory/prismaCatalog";
import { approveListingForm, rejectListingForm } from "./actions";

export const revalidate = 0;

const STATUS_FILTERS = ["ALL", "DRAFT", "PENDING_REVIEW", "LIVE", "SUSPENDED", "EXPIRED"] as const;

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  PENDING_REVIEW: "bg-amber-100 text-amber-800",
  LIVE: "bg-emerald-100 text-emerald-800",
  SUSPENDED: "bg-orange-100 text-orange-800",
  EXPIRED: "bg-red-100 text-red-700",
};

export default async function ListingsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = STATUS_FILTERS.includes(status as never) ? status : "ALL";

  const listings = await prisma.listing.findMany({
    where: filter === "ALL" ? {} : { status: filter as never },
    include: {
      categories: { include: { category: { select: { title: true } } } },
      subscription: { select: { stripeSubId: true, currentPeriodEnd: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Admin / <span className="text-zinc-700">Listings</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Listings</h1>
        </div>
        <Link
          href="/admin/listings/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          New listing
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/admin/listings" : `/admin/listings?status=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === s
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            {s === "PENDING_REVIEW" ? "Review queue" : s}
          </Link>
        ))}
      </div>

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
            {listings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  No listings{filter !== "ALL" ? ` in ${filter}` : ""}.
                </td>
              </tr>
            )}
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
    </div>
  );
}