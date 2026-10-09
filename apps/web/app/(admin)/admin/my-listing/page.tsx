import Link from "next/link";
import { prisma } from "@/modules/shared";
import { requireUser } from "@/modules/auth";

export const revalidate = 0;

const STATUS_BADGES: Record<string, string> = {
  LIVE: "bg-emerald-100 text-emerald-700",
  PENDING_REVIEW: "bg-amber-100 text-amber-700",
  DRAFT: "bg-zinc-100 text-zinc-600",
  SUSPENDED: "bg-orange-100 text-orange-700",
  EXPIRED: "bg-red-100 text-red-700",
};

export default async function MyListingPage() {
  const user = await requireUser();

  const listings = await prisma.listing.findMany({
    where: { claimedById: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      companyName: true,
      slug: true,
      tier: true,
      status: true,
      updatedAt: true,
    },
  });

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Directory / <span className="text-zinc-700">My Listing</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">My Listing</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Manage the listings claimed by your account. Your changes go live after
        review.
      </p>

      <div className="mt-6 max-w-3xl space-y-4">
        {listings.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-zinc-900">
              No claimed listings yet
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              When you apply for or claim a listing, it will appear here so you can
              manage your profile.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Browse the directory
            </Link>
          </div>
        ) : (
          listings.map((listing) => (
            <div
              key={listing.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-semibold text-zinc-900">
                    {listing.title}
                  </h2>
                  {listing.companyName && (
                    <span className="truncate text-sm text-zinc-500">
                      {listing.companyName}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 font-semibold uppercase text-zinc-600">
                    {listing.tier}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 font-semibold uppercase ${
                      STATUS_BADGES[listing.status] ?? "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {listing.status}
                  </span>
                  <span className="text-zinc-400">
                    Updated{" "}
                    {new Date(listing.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <a
                  href={`/listing/${listing.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-500 hover:text-zinc-900"
                >
                  View →
                </a>
                <Link
                  href={`/admin/my-listing/${listing.id}`}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}