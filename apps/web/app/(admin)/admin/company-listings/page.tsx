import type { Metadata } from "next";
import Link from "next/link";
import { prisma, TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { deleteCompanyListing } from "./actions";

export const revalidate = 0;
export const metadata: Metadata = { title: "Company Listings" };

const PAGE_SIZE = 50;

export default async function CompanyListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; error?: string }>;
}) {
  await requireSection("listings");
  const { q, page: pageParam, error } = await searchParams;
  const query = (q ?? "").trim();
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const where = {
    tenantId: TENANT_ID,
    isLandingPage: true,
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { companyName: { contains: query, mode: "insensitive" as const } },
            { slug: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        companyName: true,
        city: true,
        state: true,
        tier: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.listing.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) =>
    `/admin/company-listings?${new URLSearchParams({
      ...(query ? { q: query } : {}),
      ...(n > 1 ? { page: String(n) } : {}),
    }).toString()}`;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">
            Admin / Directory / <span className="text-zinc-700">Company Listings</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Company Listings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} company page{total === 1 ? "" : "s"} — the legacy landing pages, separate from
            directory listings.
          </p>
        </div>
        <Link
          href="/admin/company-listings/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Add New Company Page
        </Link>
      </div>

      <form method="GET" className="flex max-w-md gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search title, company, slug…"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Company Page</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {listings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                  No company pages yet.{" "}
                  <Link href="/admin/company-listings/new" className="text-zinc-700 underline">
                    Add the first one
                  </Link>
                  .
                </td>
              </tr>
            )}
            {listings.map((l) => (
              <tr key={l.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/company-listings/${l.id}/edit`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {l.title}
                  </Link>
                  <div className="text-xs text-zinc-400">/{l.slug}/</div>
                </td>
                <td className="px-4 py-3 text-zinc-700">{l.companyName ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-700">
                  {[l.city, l.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      l.tier === "PREMIUM"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {l.tier}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-700">{l.status}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {l.updatedAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteCompanyListing.bind(null, l.id)}>
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-600 underline hover:text-red-800"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="text-zinc-700 underline">
              ← Previous
            </Link>
          )}
          <span className="text-zinc-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="text-zinc-700 underline">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
