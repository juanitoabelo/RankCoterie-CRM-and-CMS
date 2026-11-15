import Link from "next/link";
import type { Metadata } from "next";
import { prisma, TENANT_ID } from "@/modules/shared";
import { safeDb } from "@/lib/db-resilient";
import SearchTracker from "@/components/analytics/SearchTracker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description: "Search local businesses, articles, and guides.",
};

type Props = { searchParams: Promise<{ q?: string | string[] }> };

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 100) ?? "";
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = first(params.q);

  const [listings, posts] = query
    ? await Promise.all([
        safeDb(
          () =>
            prisma.listing.findMany({
              where: {
                tenantId: TENANT_ID,
                status: "LIVE",
                tier: { not: "SUPPRESSED" },
                OR: [
                  { title: { contains: query, mode: "insensitive" } },
                  { summary: { contains: query, mode: "insensitive" } },
                  { description: { contains: query, mode: "insensitive" } },
                  { companyName: { contains: query, mode: "insensitive" } },
                  { city: { contains: query, mode: "insensitive" } },
                  { state: { contains: query, mode: "insensitive" } },
                  {
                    categories: {
                      some: { category: { title: { contains: query, mode: "insensitive" } } },
                    },
                  },
                ],
              },
              select: {
                id: true,
                title: true,
                slug: true,
                summary: true,
                description: true,
                companyName: true,
                city: true,
                state: true,
                tier: true,
                featuredUntil: true,
              },
              orderBy: [{ featuredUntil: "desc" }, { title: "asc" }],
              take: 20,
            }),
          [],
        ),
        safeDb(
          () =>
            prisma.customPost.findMany({
              where: {
                tenantId: TENANT_ID,
                status: "PUBLISHED",
                postType: { is: { tenantId: TENANT_ID, isPublic: true } },
                OR: [
                  { title: { contains: query, mode: "insensitive" } },
                  { excerpt: { contains: query, mode: "insensitive" } },
                  { body: { contains: query, mode: "insensitive" } },
                ],
              },
              select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                postType: { select: { slug: true, name: true } },
              },
              orderBy: { updatedAt: "desc" },
              take: 10,
            }),
          [],
        ),
      ])
    : [[], []];

  const total = listings.length + posts.length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <SearchTracker query={query} results={total} />
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Search</h1>
      <form action="/search" method="get" className="mt-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search businesses, articles, and guides"
          className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-zinc-500"
          aria-label="Search"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Search
        </button>
      </form>

      {!query ? (
        <p className="mt-8 text-sm text-zinc-500">Enter a keyword to find local businesses and guides.</p>
      ) : (
        <p className="mt-6 text-sm text-zinc-500">
          {total} result{total === 1 ? "" : "s"} for “{query}”
        </p>
      )}

      {listings.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Businesses</h2>
          <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {listings.map((listing) => (
              <li key={listing.id} className="p-4">
                <Link href={`/listing/${listing.slug}`} className="text-base font-medium text-zinc-900 hover:underline">
                  {listing.title}
                </Link>
                {listing.companyName && listing.companyName !== listing.title && (
                  <p className="text-xs text-zinc-500">{listing.companyName}</p>
                )}
                {(listing.city || listing.state) && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {[listing.city, listing.state].filter(Boolean).join(", ")}
                  </p>
                )}
                {(listing.summary || listing.description) && (
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
                    {listing.summary || listing.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {posts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Articles &amp; guides</h2>
          <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {posts.map((post) => (
              <li key={post.id} className="p-4">
                <Link
                  href={`/custom-post/${post.postType.slug}/${post.slug}`}
                  className="text-base font-medium text-zinc-900 hover:underline"
                >
                  {post.title}
                </Link>
                <p className="text-xs text-zinc-500">{post.postType.name}</p>
                {post.excerpt && <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{post.excerpt}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {query && total === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-8 text-center">
          <p className="text-sm text-zinc-600">No results found. Try a broader keyword or a city name.</p>
        </div>
      )}
    </div>
  );
}
