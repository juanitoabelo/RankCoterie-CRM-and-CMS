import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/modules/shared";
import { getCurrentUser } from "@/modules/auth";
import { companyLogout } from "./login/actions";

export const revalidate = 0;

const STATUS_BADGES: Record<string, string> = {
  LIVE: "bg-emerald-100 text-emerald-700",
  PENDING_REVIEW: "bg-amber-100 text-amber-700",
  DRAFT: "bg-zinc-100 text-zinc-600",
  SUSPENDED: "bg-orange-100 text-orange-700",
  EXPIRED: "bg-red-100 text-red-700",
};

function money(v: { toString(): string }): string {
  return `$${Number(v.toString()).toFixed(2)}`;
}

export default async function CompanyPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/company/login");
  const { ok, error } = await searchParams;

  const listings = await prisma.listing.findMany({
    where: { claimedById: user.id, isLandingPage: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      tier: true,
      status: true,
      updatedAt: true,
    },
  });

  const listingIds = listings.map((l) => l.id);
  const invoices = listingIds.length
    ? await prisma.invoice.findMany({
        where: { listingId: { in: listingIds } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          amount: true,
          status: true,
          isRecurring: true,
          interval: true,
          payUrl: true,
          createdAt: true,
          paidAt: true,
          listingId: true,
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Company Portal</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Signed in as {user.email} — manage your company pages and invoices.
          </p>
        </div>
        <form action={companyLogout}>
          <button className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            Sign out
          </button>
        </form>
      </div>

      {ok && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          {ok}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Pages */}
      <section className="mt-8">
        <h2 className="text-base font-semibold text-zinc-900">Your pages</h2>
        <div className="mt-3 space-y-3">
          {listings.length === 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
              <p className="text-sm text-zinc-500">
                No company pages on this account yet.
              </p>
              <Link
                href="/apply/company"
                className="mt-4 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Get a company page
              </Link>
            </div>
          )}
          {listings.map((l) => (
            <div
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-zinc-900">{l.title}</h3>
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold uppercase text-zinc-600">
                    {l.tier}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                      STATUS_BADGES[l.status] ?? "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {l.status}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  /LandingPage/{l.slug}/ · updated{" "}
                  {new Date(l.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <a
                  href={`/LandingPage/${l.slug}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-zinc-500 hover:text-zinc-900"
                >
                  View ↗
                </a>
                <Link
                  href={`/company/edit/${l.id}`}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Invoices */}
      {listings.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold text-zinc-900">Recent invoices</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {invoices.length === 0 ? (
              <p className="p-6 text-sm text-zinc-500">No invoices yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Page</th>
                    <th className="px-4 py-2.5 font-medium">Amount</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="max-w-[12rem] truncate px-4 py-2.5 text-zinc-700">
                        {listings.find((l) => l.id === inv.listingId)?.title ?? "—"}
                        {inv.isRecurring && (
                          <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500">
                            {inv.interval ?? "recurring"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-zinc-900">
                        {money(inv.amount)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            inv.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {inv.status === "APPROVED" ? "Paid" : "Due"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5">
                        {inv.status !== "APPROVED" && inv.payUrl ? (
                          <a
                            href={inv.payUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-emerald-700 hover:underline"
                          >
                            Pay now ↗
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
