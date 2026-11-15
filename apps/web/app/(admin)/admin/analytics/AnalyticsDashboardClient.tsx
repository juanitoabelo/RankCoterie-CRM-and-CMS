"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AnalyticsSummary,
  CategoryBenchmarkRow,
  CompetitorRow,
  ContentTypeRow,
  DeviceRow,
  GeoRow,
  ListingPeerRow,
  ReferrerRow,
  SearchQueryRow,
  SearchSummary,
  SourceRow,
  TimeSeriesPoint,
  TopPageRow,
  TrackingHealth,
} from "@/modules/analytics/types";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#71717a"];

function number(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function duration(ms: number): string {
  if (!ms) return "0s";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function delta(current: number, previous: number): string {
  if (previous <= 0) return current > 0 ? "new" : "0%";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}

function Card({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm">{children}</table></div>;
}

function Th({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`border-b border-zinc-200 py-2 font-medium text-zinc-500 ${right ? "text-right" : ""}`}>{children}</th>;
}

function Td({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return <td className={`border-b border-zinc-100 py-2 text-zinc-700 ${right ? "text-right" : ""}`}>{children}</td>;
}

export default function AnalyticsDashboardClient({
  days,
  summary,
  series,
  topPages,
  contentTypes,
  geo,
  sources,
  referrers,
  devices,
  browsers,
  searchSummary,
  gscQueries,
  internalQueries,
  listingPeers,
  categoryBenchmarks,
  competitors,
  health,
}: {
  days: number;
  summary: AnalyticsSummary;
  series: TimeSeriesPoint[];
  topPages: TopPageRow[];
  contentTypes: ContentTypeRow[];
  geo: GeoRow[];
  sources: SourceRow[];
  referrers: ReferrerRow[];
  devices: DeviceRow[];
  browsers: DeviceRow[];
  searchSummary: SearchSummary;
  gscQueries: SearchQueryRow[];
  internalQueries: SearchQueryRow[];
  listingPeers: ListingPeerRow[];
  categoryBenchmarks: CategoryBenchmarkRow[];
  competitors: CompetitorRow[];
  health: TrackingHealth;
}) {
  const ranges = [7, 30, 90, 365];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">
            First-party events, site search, and search performance. Last {days} days.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ranges.map((range) => (
            <Link
              key={range}
              href={`/admin/analytics?days=${range}`}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                range === days
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {range === 365 ? "1y" : `${range}d`}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link href="/admin/analytics/search" className="text-zinc-600 hover:text-zinc-900 hover:underline">Search performance</Link>
        <Link href="/admin/analytics/competitors" className="text-zinc-600 hover:text-zinc-900 hover:underline">Competitors</Link>
        <Link href="/admin/analytics/settings" className="text-zinc-600 hover:text-zinc-900 hover:underline">Settings</Link>
      </div>

      {!health.lastEventAt && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No analytics events have been recorded yet. Visit the public site to verify the tracker, or check the collector route.
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Pageviews" value={number(summary.pageviews)} sub={`${delta(summary.pageviews, summary.previous.pageviews)} vs previous`} />
        <Card label="Visitors" value={number(summary.visitors)} sub={`${delta(summary.visitors, summary.previous.visitors)} vs previous`} />
        <Card label="Sessions" value={number(summary.sessions)} sub={`${delta(summary.sessions, summary.previous.sessions)} vs previous`} />
        <Card label="Conversions" value={number(summary.conversions)} sub={`${delta(summary.conversions, summary.previous.conversions)} vs previous`} />
        <Card label="Bounce rate" value={`${summary.bounceRate}%`} sub="Single-page sessions" />
        <Card label="Avg. engagement" value={duration(summary.avgDurationMs)} sub={`${summary.avgScrollDepth}% avg scroll`} />
        <Card label="GSC clicks" value={number(searchSummary.gscClicks)} sub={`${number(searchSummary.gscImpressions)} impressions`} />
        <Card label="Internal searches" value={number(searchSummary.internalSearches)} sub={`${number(searchSummary.zeroResultSearches)} zero-result`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel title="Traffic">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="pageviews" name="Pageviews" stroke="#2563eb" fill="url(#pv)" strokeWidth={2} />
                <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#10b981" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </div>
        <Panel title="Devices">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={devices} dataKey="views" nameKey="label" outerRadius={90} label>
                {devices.map((entry, index) => (
                  <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Top pages">
          <Table>
            <thead><tr><Th>Page</Th><Th right>Views</Th><Th right>Visitors</Th><Th right>Conv.</Th></tr></thead>
            <tbody>
              {topPages.map((page) => (
                <tr key={page.path}>
                  <Td><span className="block max-w-[280px] truncate">{page.title || page.path}</span><span className="text-xs text-zinc-400">{page.path}</span></Td>
                  <Td right>{number(page.views)}</Td>
                  <Td right>{number(page.visitors)}</Td>
                  <Td right>{number(page.conversions)}</Td>
                </tr>
              ))}
              {topPages.length === 0 && <tr><Td>No pageviews yet.</Td><Td right>—</Td><Td right>—</Td><Td right>—</Td></tr>}
            </tbody>
          </Table>
        </Panel>

        <Panel title="Traffic sources">
          <Table>
            <thead><tr><Th>Source</Th><Th>Medium</Th><Th right>Views</Th><Th right>Conv.</Th></tr></thead>
            <tbody>
              {sources.map((source) => (
                <tr key={`${source.source}:${source.medium}:${source.campaign}`}>
                  <Td>{source.source}{source.campaign && <span className="text-xs text-zinc-400"> / {source.campaign}</span>}</Td>
                  <Td>{source.medium}</Td>
                  <Td right>{number(source.views)}</Td>
                  <Td right>{number(source.conversions)}</Td>
                </tr>
              ))}
              {sources.length === 0 && <tr><Td>No source data yet.</Td><Td>—</Td><Td right>—</Td><Td right>—</Td></tr>}
            </tbody>
          </Table>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Content types">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={contentTypes} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="contentType" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="views" name="Views" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Geography">
          <Table>
            <thead><tr><Th>Location</Th><Th right>Views</Th><Th right>Visitors</Th></tr></thead>
            <tbody>
              {geo.slice(0, 10).map((row) => (
                <tr key={`${row.country}:${row.region}:${row.city}`}>
                  <Td>{[row.city, row.region, row.country].filter(Boolean).join(", ") || "Unknown"}</Td>
                  <Td right>{number(row.views)}</Td>
                  <Td right>{number(row.visitors)}</Td>
                </tr>
              ))}
              {geo.length === 0 && <tr><Td>No geography data yet.</Td><Td right>—</Td><Td right>—</Td></tr>}
            </tbody>
          </Table>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Listing performance">
          <Table>
            <thead><tr><Th>Listing</Th><Th right>Views</Th><Th right>Visitors</Th><Th right>Leads</Th></tr></thead>
            <tbody>
              {listingPeers.slice(0, 10).map((row) => (
                <tr key={row.listingId}>
                  <Td><Link href={`/listing/${row.slug}`} className="hover:underline">{row.title}</Link><span className="block text-xs text-zinc-400">{[row.city, row.state].filter(Boolean).join(", ")}</span></Td>
                  <Td right>{number(row.views)}</Td>
                  <Td right>{number(row.visitors)}</Td>
                  <Td right>{number(row.leads)}</Td>
                </tr>
              ))}
              {listingPeers.length === 0 && <tr><Td>No listing events yet.</Td><Td right>—</Td><Td right>—</Td><Td right>—</Td></tr>}
            </tbody>
          </Table>
        </Panel>

        <Panel title="Category benchmarks">
          <Table>
            <thead><tr><Th>Category</Th><Th right>Listings</Th><Th right>Views</Th><Th right>Avg/listing</Th></tr></thead>
            <tbody>
              {categoryBenchmarks.slice(0, 10).map((row) => (
                <tr key={row.category}>
                  <Td>{row.category}</Td>
                  <Td right>{number(row.listings)}</Td>
                  <Td right>{number(row.views)}</Td>
                  <Td right>{number(row.avgViewsPerListing)}</Td>
                </tr>
              ))}
              {categoryBenchmarks.length === 0 && <tr><Td>No category data yet.</Td><Td right>—</Td><Td right>—</Td><Td right>—</Td></tr>}
            </tbody>
          </Table>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Search queries" action={<Link href="/admin/analytics/search" className="text-xs text-zinc-500 hover:text-zinc-900">View all</Link>}>
          <Table>
            <thead><tr><Th>Query</Th><Th right>Clicks</Th><Th right>Impr.</Th><Th right>Pos.</Th></tr></thead>
            <tbody>
              {gscQueries.slice(0, 8).map((row) => (
                <tr key={`gsc:${row.query}`}><Td>{row.query}</Td><Td right>{number(row.clicks)}</Td><Td right>{number(row.impressions)}</Td><Td right>{row.position ? row.position.toFixed(1) : "—"}</Td></tr>
              ))}
              {gscQueries.length === 0 && <tr><Td>No Search Console data yet.</Td><Td right>—</Td><Td right>—</Td><Td right>—</Td></tr>}
            </tbody>
          </Table>
        </Panel>

        <Panel title="On-site searches" action={<Link href="/admin/analytics/search" className="text-xs text-zinc-500 hover:text-zinc-900">View all</Link>}>
          <Table>
            <thead><tr><Th>Query</Th><Th right>Searches</Th><Th right>Results</Th><Th right>Zero</Th></tr></thead>
            <tbody>
              {internalQueries.slice(0, 8).map((row) => (
                <tr key={`internal:${row.query}`}><Td>{row.query}</Td><Td right>{number(row.impressions)}</Td><Td right>{number(row.resultsCount)}</Td><Td right>{number(row.zeroResults)}</Td></tr>
              ))}
              {internalQueries.length === 0 && <tr><Td>No on-site searches yet.</Td><Td right>—</Td><Td right>—</Td><Td right>—</Td></tr>}
            </tbody>
          </Table>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Referrers">
          <Table>
            <thead><tr><Th>Referrer</Th><Th right>Views</Th><Th right>Visitors</Th></tr></thead>
            <tbody>
              {referrers.slice(0, 8).map((row) => (
                <tr key={row.referrerHost}><Td>{row.referrerHost}</Td><Td right>{number(row.views)}</Td><Td right>{number(row.visitors)}</Td></tr>
              ))}
              {referrers.length === 0 && <tr><Td>No referrer data yet.</Td><Td right>—</Td><Td right>—</Td></tr>}
            </tbody>
          </Table>
        </Panel>

        <Panel title="Browsers">
          <Table>
            <thead><tr><Th>Browser</Th><Th right>Views</Th><Th right>Visitors</Th></tr></thead>
            <tbody>
              {browsers.slice(0, 8).map((row) => (
                <tr key={row.label}><Td>{row.label}</Td><Td right>{number(row.views)}</Td><Td right>{number(row.visitors)}</Td></tr>
              ))}
              {browsers.length === 0 && <tr><Td>No browser data yet.</Td><Td right>—</Td><Td right>—</Td></tr>}
            </tbody>
          </Table>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Competitor rankings" action={<Link href="/admin/analytics/competitors" className="text-xs text-zinc-500 hover:text-zinc-900">View all</Link>}>
          <Table>
            <thead><tr><Th>Competitor</Th><Th>Keyword</Th><Th right>Position</Th><Th>Date</Th></tr></thead>
            <tbody>
              {competitors.slice(0, 10).map((row) => (
                <tr key={`${row.competitorDomain}:${row.keyword}:${row.date}`}><Td>{row.competitorDomain}</Td><Td>{row.keyword}</Td><Td right>{row.position ?? "—"}</Td><Td>{row.date}</Td></tr>
              ))}
              {competitors.length === 0 && <tr><Td>No competitor data yet.</Td><Td>—</Td><Td right>—</Td><Td>—</Td></tr>}
            </tbody>
          </Table>
        </Panel>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">
        <p className="font-medium text-zinc-700">Tracking health</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <p>Last event: {health.lastEventAt ? new Date(health.lastEventAt).toLocaleString() : "never"}</p>
          <p>Events today: {number(health.eventsToday)}</p>
          <p>Bot events today: {number(health.botEventsToday)} ({health.botRateToday}%)</p>
          <p>Retention: {health.retentionDays} days</p>
        </div>
      </div>
    </div>
  );
}
