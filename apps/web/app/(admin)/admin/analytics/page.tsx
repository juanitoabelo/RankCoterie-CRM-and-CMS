import { requireSection } from "@/modules/auth";
import {
  getAnalyticsSummary,
  getBrowserBreakdown,
  getCategoryBenchmarks,
  getCompetitorRankings,
  getContentTypeBreakdown,
  getDeviceBreakdown,
  getGeoBreakdown,
  getGscQueries,
  getInternalSearchQueries,
  getListingPeers,
  getReferrers,
  getSearchSummary,
  getSourceBreakdown,
  getTimeSeries,
  getTopPages,
  getTrackingHealth,
  parseDays,
  resolveAnalyticsRange,
} from "@/modules/analytics";
import AnalyticsDashboardClient from "./AnalyticsDashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Analytics | Admin" };

type Props = { searchParams: Promise<{ days?: string | string[] }> };

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  await requireSection("analytics");
  const params = await searchParams;
  const raw = Array.isArray(params.days) ? params.days[0] : params.days;
  const days = parseDays(raw, 30);
  const range = resolveAnalyticsRange(days);

  const [
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
  ] = await Promise.all([
    getAnalyticsSummary(range),
    getTimeSeries(range),
    getTopPages(range, 20),
    getContentTypeBreakdown(range),
    getGeoBreakdown(range, 50),
    getSourceBreakdown(range, 20),
    getReferrers(range, 20),
    getDeviceBreakdown(range),
    getBrowserBreakdown(range),
    getSearchSummary(range),
    getGscQueries(range, 20),
    getInternalSearchQueries(range, 20),
    getListingPeers(range, 20),
    getCategoryBenchmarks(range, 20),
    getCompetitorRankings(range, 20),
    getTrackingHealth(),
  ]);

  return (
    <AnalyticsDashboardClient
      days={days}
      summary={summary}
      series={series}
      topPages={topPages}
      contentTypes={contentTypes}
      geo={geo}
      sources={sources}
      referrers={referrers}
      devices={devices}
      browsers={browsers}
      searchSummary={searchSummary}
      gscQueries={gscQueries}
      internalQueries={internalQueries}
      listingPeers={listingPeers}
      categoryBenchmarks={categoryBenchmarks}
      competitors={competitors}
      health={health}
    />
  );
}
