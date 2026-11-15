import Link from "next/link";
import { requireSection } from "@/modules/auth";
import {
  getCompetitorRankings,
  getTrackingHealth,
  parseDays,
  resolveAnalyticsRange,
} from "@/modules/analytics";
import SyncButton from "../SyncButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Competitors | Admin" };

type Props = { searchParams: Promise<{ days?: string | string[] }> };

export default async function AdminCompetitorsPage({ searchParams }: Props) {
  await requireSection("analytics");
  const params = await searchParams;
  const raw = Array.isArray(params.days) ? params.days[0] : params.days;
  const days = parseDays(raw, 30);
  const range = resolveAnalyticsRange(days);

  const [rows, health] = await Promise.all([
    getCompetitorRankings(range, 500),
    getTrackingHealth(),
  ]);

  const grouped = new Map<string, { keyword: string; competitor: string; position: number | null; date: string }>();
  for (const row of rows) {
    const key = `${row.competitorDomain}:${row.keyword}`;
    const existing = grouped.get(key);
    if (!existing || existing.date < row.date) {
      grouped.set(key, {
        keyword: row.keyword,
        competitor: row.competitorDomain,
        position: row.position,
        date: row.date,
      });
    }
  }
  const latest = Array.from(grouped.values()).sort((a, b) =>
    a.competitor.localeCompare(b.competitor) || a.keyword.localeCompare(b.keyword),
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Competitor rankings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Google organic positions for configured keywords. Last {days} days.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/analytics" className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline">Back to overview</Link>
          <SyncButton kind="competitors" label="Sync competitors" />
        </div>
      </div>

      {!health.competitorConfigured && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Competitor tracking is not fully configured. Add competitor domains and target keywords in{" "}
          <Link href="/admin/analytics/settings" className="font-medium underline">Analytics Settings</Link>, and set
          DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD.
        </div>
      )}
      {health.competitorLastError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Last sync error: {health.competitorLastError}
        </div>
      )}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Latest positions</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Competitor</th>
                <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Keyword</th>
                <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Position</th>
                <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((row) => (
                <tr key={`${row.competitor}:${row.keyword}`}>
                  <td className="border-b border-zinc-100 py-2 text-zinc-700">{row.competitor}</td>
                  <td className="border-b border-zinc-100 py-2 text-zinc-700">{row.keyword}</td>
                  <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">{row.position ?? "Not in top 100"}</td>
                  <td className="border-b border-zinc-100 py-2 text-right text-zinc-500">{row.date}</td>
                </tr>
              ))}
              {latest.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-zinc-500">No competitor rankings yet. Run a sync after configuring keywords.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Recent snapshots</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Date</th>
                <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Competitor</th>
                <th className="border-b border-zinc-200 py-2 font-medium text-zinc-500">Keyword</th>
                <th className="border-b border-zinc-200 py-2 text-right font-medium text-zinc-500">Position</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((row) => (
                <tr key={`${row.competitorDomain}:${row.keyword}:${row.date}`}>
                  <td className="border-b border-zinc-100 py-2 text-zinc-500">{row.date}</td>
                  <td className="border-b border-zinc-100 py-2 text-zinc-700">{row.competitorDomain}</td>
                  <td className="border-b border-zinc-100 py-2 text-zinc-700">{row.keyword}</td>
                  <td className="border-b border-zinc-100 py-2 text-right text-zinc-700">{row.position ?? "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-zinc-500">No snapshots yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
