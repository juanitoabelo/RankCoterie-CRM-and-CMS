import Link from "next/link";
import { requireSection } from "@/modules/auth";
import {
  getAnalyticsSettings,
  getCategoryBenchmarks,
  getCompetitorRankings,
  getListingPeers,
  getTrackingHealth,
  parseDays,
  resolveAnalyticsRange,
} from "@/modules/analytics";
import SyncButton from "../SyncButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Competitors | Admin" };

type Props = { searchParams: Promise<{ days?: string | string[] }> };

const PROVIDER_LABELS = {
  manual: "Manual watchlist",
  searxng: "SearXNG",
  dataforseo: "DataForSEO",
} as const;

function googleSearchUrl(domain: string, keyword: string): string {
  const query = keyword ? `site:${domain} ${keyword}` : `site:${domain}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export default async function AdminCompetitorsPage({ searchParams }: Props) {
  await requireSection("analytics");
  const params = await searchParams;
  const raw = Array.isArray(params.days) ? params.days[0] : params.days;
  const days = parseDays(raw, 30);
  const range = resolveAnalyticsRange(days);

  const [rows, health, settings, listingPeers, categoryBenchmarks] = await Promise.all([
    getCompetitorRankings(range, 500),
    getTrackingHealth(),
    getAnalyticsSettings(),
    getListingPeers(range, 10),
    getCategoryBenchmarks(range, 10),
  ]);

  const provider = health.competitorProvider;
  const grouped = new Map<
    string,
    { keyword: string; competitor: string; position: number | null; source: string; date: string }
  >();
  for (const row of rows) {
    const key = `${row.competitorDomain}:${row.keyword}`;
    const existing = grouped.get(key);
    if (!existing || existing.date < row.date) {
      grouped.set(key, {
        keyword: row.keyword,
        competitor: row.competitorDomain,
        position: row.position,
        source: row.source,
        date: row.date,
      });
    }
  }
  const latest = Array.from(grouped.values()).sort((a, b) =>
    a.competitor.localeCompare(b.competitor) || a.keyword.localeCompare(b.keyword),
  );

  const watchlist = settings.competitorDomains.flatMap((domain) => {
    const keywords = settings.targetKeywords.length > 0 ? settings.targetKeywords : [""];
    return keywords.map((keyword) => ({ domain, keyword }));
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Competitors</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Internal peer benchmarks and external checks. Provider: {PROVIDER_LABELS[provider]}. Last {days} days.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/analytics" className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline">
            Back to overview
          </Link>
          {provider !== "manual" && <SyncButton kind="competitors" label="Sync competitors" />}
        </div>
      </div>

      {!health.competitorConfigured && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {provider === "manual" && (
            <>
              Add competitor domains in{" "}
              <Link href="/admin/analytics/settings" className="font-medium underline">
                Analytics Settings
              </Link>{" "}
              to build your manual watchlist.
            </>
          )}
          {provider === "searxng" && (
            <>
              Add competitor domains, target keywords, and a SearXNG URL in{" "}
              <Link href="/admin/analytics/settings" className="font-medium underline">
                Analytics Settings
              </Link>
              .
            </>
          )}
          {provider === "dataforseo" && (
            <>
              Add competitor domains, target keywords, and DataForSEO credentials in{" "}
              <Link href="/admin/analytics/settings" className="font-medium underline">
                Analytics Settings
              </Link>
              .
            </>
          )}
        </div>
      )}
      {provider !== "manual" && health.competitorLastError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Last sync error: {health.competitorLastError}
        </div>
      )}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Internal peers</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Listings in the same directory that are getting the most attention in this range.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Listing</th>
                <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Location</th>
                <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Views</th>
                <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Leads</th>
              </tr>
            </thead>
            <tbody>
              {listingPeers.map((row) => (
                <tr key={row.listingId}>
                  <td className="border-b border-zinc-100 py-2 text-zinc-700">
                    <Link href={`/listing/${row.slug}`} className="hover:underline">
                      {row.title}
                    </Link>
                  </td>
                  <td className="border-b border-zinc-100 py-2 text-zinc-500">
                    {[row.city, row.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">{row.views}</td>
                  <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">{row.leads}</td>
                </tr>
              ))}
              {listingPeers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-zinc-500">
                    No internal peer activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {provider === "manual" ? (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Manual watchlist</h2>
          <p className="mt-1 text-xs text-zinc-500">
            No external API is used. Use these links to spot-check competitor visibility.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Competitor</th>
                  <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Keyword</th>
                  <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Check</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((row) => (
                  <tr key={`${row.domain}:${row.keyword}`}>
                    <td className="border-b border-zinc-100 py-2 text-zinc-700">
                      <a
                        href={`https://${row.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {row.domain}
                      </a>
                    </td>
                    <td className="border-b border-zinc-100 py-2 text-zinc-700">{row.keyword || "—"}</td>
                    <td className="border-b border-zinc-100 py-2 text-right">
                      <a
                        href={googleSearchUrl(row.domain, row.keyword)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-600 hover:text-zinc-900 hover:underline"
                      >
                        Open Google
                      </a>
                    </td>
                  </tr>
                ))}
                {watchlist.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-zinc-500">
                      Add competitor domains in Analytics Settings to build the watchlist.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Latest positions</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Competitor</th>
                  <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Keyword</th>
                  <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Source</th>
                  <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Position</th>
                  <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((row) => (
                  <tr key={`${row.competitor}:${row.keyword}`}>
                    <td className="border-b border-zinc-100 py-2 text-zinc-700">{row.competitor}</td>
                    <td className="border-b border-zinc-100 py-2 text-zinc-700">{row.keyword}</td>
                    <td className="border-b border-zinc-100 py-2 text-zinc-500">{row.source}</td>
                    <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">
                      {row.position ?? "Not in results"}
                    </td>
                    <td className="border-b border-zinc-100 py-2 text-right text-zinc-500">{row.date}</td>
                  </tr>
                ))}
                {latest.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-zinc-500">
                      No competitor rankings yet. Run a sync after configuring keywords.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Recent snapshots</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Date</th>
                  <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Competitor</th>
                  <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Keyword</th>
                  <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Source</th>
                  <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Position</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((row) => (
                  <tr key={`${row.competitorDomain}:${row.keyword}:${row.source}:${row.date}`}>
                    <td className="border-b border-zinc-100 py-2 text-zinc-500">{row.date}</td>
                    <td className="border-b border-zinc-100 py-2 text-zinc-700">{row.competitorDomain}</td>
                    <td className="border-b border-zinc-100 py-2 text-zinc-700">{row.keyword}</td>
                    <td className="border-b border-zinc-100 py-2 text-zinc-500">{row.source}</td>
                    <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">
                      {row.position ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Category benchmarks</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Category</th>
                <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Listings</th>
                <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Views</th>
                <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Visitors</th>
                <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Avg views</th>
              </tr>
            </thead>
            <tbody>
              {categoryBenchmarks.map((row) => (
                <tr key={row.category}>
                  <td className="border-b border-zinc-100 py-2 text-zinc-700">{row.category}</td>
                  <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">{row.listings}</td>
                  <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">{row.views}</td>
                  <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">{row.visitors}</td>
                  <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">
                    {row.avgViewsPerListing}
                  </td>
                </tr>
              ))}
              {categoryBenchmarks.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-500">
                    No category benchmarks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
