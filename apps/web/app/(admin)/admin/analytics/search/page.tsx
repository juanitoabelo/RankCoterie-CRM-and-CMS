import Link from "next/link";
import { requireSection } from "@/modules/auth";
import {
  getGscQueries,
  getInternalSearchQueries,
  getSearchSummary,
  parseDays,
  resolveAnalyticsRange,
} from "@/modules/analytics";
import SyncButton from "../SyncButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Search Performance | Admin" };

type Props = { searchParams: Promise<{ days?: string | string[] }> };

function number(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export default async function AdminSearchPerformancePage({ searchParams }: Props) {
  await requireSection("analytics");
  const params = await searchParams;
  const raw = Array.isArray(params.days) ? params.days[0] : params.days;
  const days = parseDays(raw, 30);
  const range = resolveAnalyticsRange(days);

  const [summary, gsc, internal] = await Promise.all([
    getSearchSummary(range),
    getGscQueries(range, 100),
    getInternalSearchQueries(range, 100),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Search performance</h1>
          <p className="mt-1 text-sm text-zinc-500">Google Search Console and on-site search. Last {days} days.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/analytics" className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline">Back to overview</Link>
          <SyncButton kind="gsc" label="Sync Search Console" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">GSC clicks</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{number(summary.gscClicks)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">GSC impressions</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{number(summary.gscImpressions)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">GSC CTR</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{(summary.gscCtr * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">On-site searches</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{number(summary.internalSearches)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Zero-result searches</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{number(summary.zeroResultSearches)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Google Search Console</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Query</th>
                  <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Clicks</th>
                  <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Impr.</th>
                  <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">CTR</th>
                  <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {gsc.map((row) => (
                  <tr key={row.query}>
                    <td className="border-b border-zinc-100 py-2 text-zinc-700">{row.query}</td>
                    <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">{number(row.clicks)}</td>
                    <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">{number(row.impressions)}</td>
                    <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">{(row.ctr * 100).toFixed(1)}%</td>
                    <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">{row.position ? row.position.toFixed(1) : "—"}</td>
                  </tr>
                ))}
                {gsc.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-zinc-500">No Search Console data. Configure the property and sync.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">On-site search</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Query</th>
                  <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Searches</th>
                  <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Avg results</th>
                  <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Zero-result</th>
                </tr>
              </thead>
              <tbody>
                {internal.map((row) => (
                  <tr key={row.query}>
                    <td className="border-b border-zinc-100 py-2 text-zinc-700">{row.query}</td>
                    <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">{number(row.impressions)}</td>
                    <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">{number(row.resultsCount)}</td>
                    <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">{number(row.zeroResults)}</td>
                  </tr>
                ))}
                {internal.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-zinc-500">No on-site searches yet. Try the public search page.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
