import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { CONVERSION_EVENTS } from "./constants";
import { getAnalyticsSettingsRecord, resolveAnalyticsSecret } from "./settings";
import { addDays, dayKey, formatDayLabel, startOfUtcDay } from "./range";
import type {
  AnalyticsRange,
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
} from "./types";

const CONVERSION_LIST = Prisma.raw(
  CONVERSION_EVENTS.map((event) => `'${event}'`).join(","),
);

type SummaryRow = {
  pageviews: number;
  visitors: number;
  sessions: number;
  conversions: number;
  total_events: number;
  bot_events: number;
  avg_duration: number;
  avg_scroll: number;
  session_count: number;
  bounced_sessions: number;
};

async function summaryFor(from: Date, to: Date): Promise<SummaryRow> {
  const rows = await prisma.$queryRaw<SummaryRow[]>`
    WITH pv AS (
      SELECT "sessionId", count(*) AS views
      FROM "AnalyticsEvent"
      WHERE "tenantId" = ${TENANT_ID}
        AND "occurredAt" >= ${from}
        AND "occurredAt" < ${to}
        AND "eventType" = 'page_view'
        AND "isBot" = false
      GROUP BY "sessionId"
    ),
    totals AS (
      SELECT
        count(*) FILTER (WHERE "eventType" = 'page_view' AND "isBot" = false)::int AS pageviews,
        count(DISTINCT "visitorId") FILTER (WHERE "eventType" = 'page_view' AND "isBot" = false)::int AS visitors,
        count(DISTINCT "sessionId") FILTER (WHERE "eventType" = 'page_view' AND "isBot" = false)::int AS sessions,
        count(*) FILTER (WHERE "eventType" IN (${CONVERSION_LIST}) AND "isBot" = false)::int AS conversions,
        count(*)::int AS total_events,
        count(*) FILTER (WHERE "isBot")::int AS bot_events,
        coalesce(round(avg("durationMs") FILTER (WHERE "eventType" = 'engagement' AND "isBot" = false))::int, 0) AS avg_duration,
        coalesce(round(avg("scrollDepth") FILTER (WHERE "eventType" = 'engagement' AND "isBot" = false))::int, 0) AS avg_scroll
      FROM "AnalyticsEvent"
      WHERE "tenantId" = ${TENANT_ID}
        AND "occurredAt" >= ${from}
        AND "occurredAt" < ${to}
    )
    SELECT
      t.*,
      (SELECT count(*) FROM pv)::int AS session_count,
      (SELECT count(*) FROM pv WHERE views = 1)::int AS bounced_sessions
    FROM totals t
  `;
  return rows[0] ?? {
    pageviews: 0,
    visitors: 0,
    sessions: 0,
    conversions: 0,
    total_events: 0,
    bot_events: 0,
    avg_duration: 0,
    avg_scroll: 0,
    session_count: 0,
    bounced_sessions: 0,
  };
}

export async function getAnalyticsSummary(range: AnalyticsRange): Promise<AnalyticsSummary> {
  const [current, previous] = await Promise.all([
    summaryFor(range.from, range.to),
    summaryFor(range.previousFrom, range.previousTo),
  ]);

  const bounceRate =
    current.session_count > 0
      ? Number(((current.bounced_sessions / current.session_count) * 100).toFixed(1))
      : 0;
  const botRate =
    current.total_events > 0
      ? Number(((current.bot_events / current.total_events) * 100).toFixed(1))
      : 0;

  return {
    pageviews: current.pageviews,
    visitors: current.visitors,
    sessions: current.sessions,
    conversions: current.conversions,
    bounceRate,
    avgDurationMs: current.avg_duration,
    avgScrollDepth: current.avg_scroll,
    botEvents: current.bot_events,
    totalEvents: current.total_events,
    botRate,
    previous: {
      pageviews: previous.pageviews,
      visitors: previous.visitors,
      sessions: previous.sessions,
      conversions: previous.conversions,
    },
  };
}

type SeriesRow = {
  date: string;
  pageviews: number;
  visitors: number;
  sessions: number;
  conversions: number;
};

export async function getTimeSeries(range: AnalyticsRange): Promise<TimeSeriesPoint[]> {
  const rows = await prisma.$queryRaw<SeriesRow[]>`
    SELECT
      to_char(date_trunc('day', "occurredAt"), 'YYYY-MM-DD') AS date,
      count(*) FILTER (WHERE "eventType" = 'page_view')::int AS pageviews,
      count(DISTINCT "visitorId") FILTER (WHERE "eventType" = 'page_view')::int AS visitors,
      count(DISTINCT "sessionId") FILTER (WHERE "eventType" = 'page_view')::int AS sessions,
      count(*) FILTER (WHERE "eventType" IN (${CONVERSION_LIST}))::int AS conversions
    FROM "AnalyticsEvent"
    WHERE "tenantId" = ${TENANT_ID}
      AND "occurredAt" >= ${range.from}
      AND "occurredAt" < ${range.to}
      AND "isBot" = false
    GROUP BY 1
    ORDER BY 1
  `;

  const byDate = new Map(rows.map((row) => [row.date, row]));
  const points: TimeSeriesPoint[] = [];
  for (let cursor = new Date(range.from); cursor < range.to; cursor = addDays(cursor, 1)) {
    const key = dayKey(cursor);
    const row = byDate.get(key);
    points.push({
      date: key,
      label: formatDayLabel(key),
      pageviews: row?.pageviews ?? 0,
      visitors: row?.visitors ?? 0,
      sessions: row?.sessions ?? 0,
      conversions: row?.conversions ?? 0,
    });
  }
  return points;
}

type TopPageSqlRow = {
  path: string;
  title: string | null;
  content_type: string | null;
  content_id: string | null;
  views: number;
  visitors: number;
  conversions: number;
};

export async function getTopPages(
  range: AnalyticsRange,
  limit = 25,
): Promise<TopPageRow[]> {
  const rows = await prisma.$queryRaw<TopPageSqlRow[]>`
    SELECT
      path,
      max(title) AS title,
      max("contentType") AS content_type,
      max("contentId") AS content_id,
      count(*) FILTER (WHERE "eventType" = 'page_view')::int AS views,
      count(DISTINCT "visitorId") FILTER (WHERE "eventType" = 'page_view')::int AS visitors,
      count(*) FILTER (WHERE "eventType" IN (${CONVERSION_LIST}))::int AS conversions
    FROM "AnalyticsEvent"
    WHERE "tenantId" = ${TENANT_ID}
      AND "occurredAt" >= ${range.from}
      AND "occurredAt" < ${range.to}
      AND "isBot" = false
      AND path NOT LIKE '/admin%'
      AND path NOT LIKE '/api%'
    GROUP BY path
    ORDER BY views DESC, path ASC
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    path: row.path,
    title: row.title,
    contentType: row.content_type,
    contentId: row.content_id,
    views: row.views,
    visitors: row.visitors,
    conversions: row.conversions,
  }));
}

type ContentTypeSqlRow = { content_type: string; views: number; visitors: number };

export async function getContentTypeBreakdown(
  range: AnalyticsRange,
): Promise<ContentTypeRow[]> {
  const rows = await prisma.$queryRaw<ContentTypeSqlRow[]>`
    SELECT
      coalesce(nullif("contentType", ''), 'page') AS content_type,
      count(*) FILTER (WHERE "eventType" = 'page_view')::int AS views,
      count(DISTINCT "visitorId") FILTER (WHERE "eventType" = 'page_view')::int AS visitors
    FROM "AnalyticsEvent"
    WHERE "tenantId" = ${TENANT_ID}
      AND "occurredAt" >= ${range.from}
      AND "occurredAt" < ${range.to}
      AND "isBot" = false
    GROUP BY 1
    ORDER BY views DESC
  `;
  return rows.map((row) => ({
    contentType: row.content_type,
    views: row.views,
    visitors: row.visitors,
  }));
}

type GeoSqlRow = {
  country: string;
  region: string;
  city: string;
  views: number;
  visitors: number;
};

export async function getGeoBreakdown(
  range: AnalyticsRange,
  limit = 100,
): Promise<GeoRow[]> {
  const rows = await prisma.$queryRaw<GeoSqlRow[]>`
    SELECT
      coalesce(nullif(country, ''), 'Unknown') AS country,
      coalesce(region, '') AS region,
      coalesce(city, '') AS city,
      count(*) FILTER (WHERE "eventType" = 'page_view')::int AS views,
      count(DISTINCT "visitorId") FILTER (WHERE "eventType" = 'page_view')::int AS visitors
    FROM "AnalyticsEvent"
    WHERE "tenantId" = ${TENANT_ID}
      AND "occurredAt" >= ${range.from}
      AND "occurredAt" < ${range.to}
      AND "isBot" = false
    GROUP BY 1, 2, 3
    ORDER BY views DESC
    LIMIT ${limit}
  `;
  return rows;
}

type SourceSqlRow = {
  source: string;
  medium: string;
  campaign: string;
  views: number;
  visitors: number;
  conversions: number;
};

export async function getSourceBreakdown(
  range: AnalyticsRange,
  limit = 50,
): Promise<SourceRow[]> {
  const rows = await prisma.$queryRaw<SourceSqlRow[]>`
    SELECT
      coalesce(nullif(source, ''), 'direct') AS source,
      coalesce(nullif(medium, ''), 'none') AS medium,
      coalesce(campaign, '') AS campaign,
      count(*) FILTER (WHERE "eventType" = 'page_view')::int AS views,
      count(DISTINCT "visitorId") FILTER (WHERE "eventType" = 'page_view')::int AS visitors,
      count(*) FILTER (WHERE "eventType" IN (${CONVERSION_LIST}))::int AS conversions
    FROM "AnalyticsEvent"
    WHERE "tenantId" = ${TENANT_ID}
      AND "occurredAt" >= ${range.from}
      AND "occurredAt" < ${range.to}
      AND "isBot" = false
    GROUP BY 1, 2, 3
    ORDER BY views DESC
    LIMIT ${limit}
  `;
  return rows;
}

type ReferrerSqlRow = { referrer_host: string; views: number; visitors: number };

export async function getReferrers(
  range: AnalyticsRange,
  limit = 50,
): Promise<ReferrerRow[]> {
  const rows = await prisma.$queryRaw<ReferrerSqlRow[]>`
    SELECT
      "referrerHost" AS referrer_host,
      count(*) FILTER (WHERE "eventType" = 'page_view')::int AS views,
      count(DISTINCT "visitorId") FILTER (WHERE "eventType" = 'page_view')::int AS visitors
    FROM "AnalyticsEvent"
    WHERE "tenantId" = ${TENANT_ID}
      AND "occurredAt" >= ${range.from}
      AND "occurredAt" < ${range.to}
      AND "isBot" = false
      AND "referrerHost" IS NOT NULL
      AND "referrerHost" <> ''
    GROUP BY 1
    ORDER BY views DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    referrerHost: row.referrer_host,
    views: row.views,
    visitors: row.visitors,
  }));
}

type DeviceSqlRow = { label: string; views: number; visitors: number };

export async function getDeviceBreakdown(range: AnalyticsRange): Promise<DeviceRow[]> {
  const rows = await prisma.$queryRaw<DeviceSqlRow[]>`
    SELECT
      coalesce(nullif("deviceType", ''), 'unknown') AS label,
      count(*) FILTER (WHERE "eventType" = 'page_view')::int AS views,
      count(DISTINCT "visitorId") FILTER (WHERE "eventType" = 'page_view')::int AS visitors
    FROM "AnalyticsEvent"
    WHERE "tenantId" = ${TENANT_ID}
      AND "occurredAt" >= ${range.from}
      AND "occurredAt" < ${range.to}
      AND "isBot" = false
    GROUP BY 1
    ORDER BY views DESC
  `;
  return rows;
}

export async function getBrowserBreakdown(range: AnalyticsRange): Promise<DeviceRow[]> {
  const rows = await prisma.$queryRaw<DeviceSqlRow[]>`
    SELECT
      coalesce(nullif(browser, ''), 'unknown') AS label,
      count(*) FILTER (WHERE "eventType" = 'page_view')::int AS views,
      count(DISTINCT "visitorId") FILTER (WHERE "eventType" = 'page_view')::int AS visitors
    FROM "AnalyticsEvent"
    WHERE "tenantId" = ${TENANT_ID}
      AND "occurredAt" >= ${range.from}
      AND "occurredAt" < ${range.to}
      AND "isBot" = false
    GROUP BY 1
    ORDER BY views DESC
  `;
  return rows;
}

type SearchSqlRow = {
  query: string;
  source: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  results_count: number;
  zero_results: number;
};

export async function getGscQueries(
  range: AnalyticsRange,
  limit = 50,
): Promise<SearchQueryRow[]> {
  const rows = await prisma.$queryRaw<SearchSqlRow[]>`
    SELECT
      query,
      'gsc' AS source,
      coalesce(sum(impressions), 0)::int AS impressions,
      coalesce(sum(clicks), 0)::int AS clicks,
      CASE WHEN sum(impressions) > 0 THEN sum(clicks)::float / sum(impressions) ELSE 0 END AS ctr,
      coalesce(avg(nullif(position, 0)), 0)::float AS position,
      0::int AS results_count,
      0::int AS zero_results
    FROM "AnalyticsSearchDaily"
    WHERE "tenantId" = ${TENANT_ID}
      AND "date" >= ${dayKey(range.from)}::date
      AND "date" < ${dayKey(range.to)}::date
      AND source = 'gsc'
    GROUP BY query
    ORDER BY clicks DESC, impressions DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    query: row.query,
    source: row.source,
    impressions: row.impressions,
    clicks: row.clicks,
    ctr: row.ctr,
    position: row.position,
    resultsCount: row.results_count,
    zeroResults: row.zero_results,
  }));
}

export async function getInternalSearchQueries(
  range: AnalyticsRange,
  limit = 50,
): Promise<SearchQueryRow[]> {
  const rows = await prisma.$queryRaw<SearchSqlRow[]>`
    SELECT
      coalesce(metadata->>'query', '') AS query,
      'internal' AS source,
      count(*)::int AS impressions,
      0::int AS clicks,
      0::float AS ctr,
      0::float AS position,
      coalesce(round(avg(CASE WHEN metadata->>'results' ~ '^[0-9]+$' THEN (metadata->>'results')::numeric ELSE 0 END))::int, 0) AS results_count,
      count(*) FILTER (WHERE CASE WHEN metadata->>'results' ~ '^[0-9]+$' THEN (metadata->>'results')::int ELSE 0 END = 0)::int AS zero_results
    FROM "AnalyticsEvent"
    WHERE "tenantId" = ${TENANT_ID}
      AND "occurredAt" >= ${range.from}
      AND "occurredAt" < ${range.to}
      AND "eventType" = 'search'
      AND "isBot" = false
      AND coalesce(metadata->>'query', '') <> ''
    GROUP BY 1
    ORDER BY impressions DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    query: row.query,
    source: row.source,
    impressions: row.impressions,
    clicks: row.clicks,
    ctr: row.ctr,
    position: row.position,
    resultsCount: row.results_count,
    zeroResults: row.zero_results,
  }));
}

type SearchSummarySqlRow = {
  gsc_clicks: number;
  gsc_impressions: number;
  gsc_position: number;
};

type InternalSummarySqlRow = {
  internal_searches: number;
  zero_results: number;
  unique_queries: number;
};

export async function getSearchSummary(range: AnalyticsRange): Promise<SearchSummary> {
  const [gscRows, internalRows] = await Promise.all([
    prisma.$queryRaw<SearchSummarySqlRow[]>`
      SELECT
        coalesce(sum(clicks), 0)::int AS gsc_clicks,
        coalesce(sum(impressions), 0)::int AS gsc_impressions,
        coalesce(avg(nullif(position, 0)), 0)::float AS gsc_position
      FROM "AnalyticsSearchDaily"
      WHERE "tenantId" = ${TENANT_ID}
        AND "date" >= ${dayKey(range.from)}::date
        AND "date" < ${dayKey(range.to)}::date
        AND source = 'gsc'
    `,
    prisma.$queryRaw<InternalSummarySqlRow[]>`
      SELECT
        count(*)::int AS internal_searches,
        count(*) FILTER (WHERE CASE WHEN metadata->>'results' ~ '^[0-9]+$' THEN (metadata->>'results')::int ELSE 0 END = 0)::int AS zero_results,
        count(DISTINCT coalesce(metadata->>'query', ''))::int AS unique_queries
      FROM "AnalyticsEvent"
      WHERE "tenantId" = ${TENANT_ID}
        AND "occurredAt" >= ${range.from}
        AND "occurredAt" < ${range.to}
        AND "eventType" = 'search'
        AND "isBot" = false
        AND coalesce(metadata->>'query', '') <> ''
    `,
  ]);

  const gsc = gscRows[0] ?? { gsc_clicks: 0, gsc_impressions: 0, gsc_position: 0 };
  const internal = internalRows[0] ?? { internal_searches: 0, zero_results: 0, unique_queries: 0 };

  return {
    gscClicks: gsc.gsc_clicks,
    gscImpressions: gsc.gsc_impressions,
    gscCtr: gsc.gsc_impressions > 0 ? gsc.gsc_clicks / gsc.gsc_impressions : 0,
    gscPosition: gsc.gsc_position,
    internalSearches: internal.internal_searches,
    zeroResultSearches: internal.zero_results,
    uniqueQueries: internal.unique_queries,
  };
}

type ListingPeerSqlRow = {
  listing_id: string;
  title: string;
  slug: string;
  city: string | null;
  state: string | null;
  views: number;
  visitors: number;
  leads: number;
  total_views: number;
  total_leads: number;
};

export async function getListingPeers(
  range: AnalyticsRange,
  limit = 25,
): Promise<ListingPeerRow[]> {
  const rows = await prisma.$queryRaw<ListingPeerSqlRow[]>`
    SELECT
      e."contentId" AS listing_id,
      l.title,
      l.slug,
      l.city,
      l.state,
      count(*) FILTER (WHERE e."eventType" = 'page_view')::int AS views,
      count(DISTINCT e."visitorId") FILTER (WHERE e."eventType" = 'page_view')::int AS visitors,
      count(*) FILTER (WHERE e."eventType" = 'lead_submit')::int AS leads,
      l."viewCount" AS total_views,
      l."leadCount" AS total_leads
    FROM "AnalyticsEvent" e
    JOIN "Listing" l ON l.id = e."contentId"
    WHERE e."tenantId" = ${TENANT_ID}
      AND e."occurredAt" >= ${range.from}
      AND e."occurredAt" < ${range.to}
      AND e."isBot" = false
      AND e."contentType" = 'listing'
      AND e."contentId" IS NOT NULL
    GROUP BY e."contentId", l.title, l.slug, l.city, l.state, l."viewCount", l."leadCount"
    ORDER BY views DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    listingId: row.listing_id,
    title: row.title,
    slug: row.slug,
    city: row.city,
    state: row.state,
    views: row.views,
    visitors: row.visitors,
    leads: row.leads,
    totalViews: row.total_views,
    totalLeads: row.total_leads,
  }));
}

type CategoryBenchmarkSqlRow = {
  category: string;
  listings: number;
  views: number;
  visitors: number;
  avg_views: number;
};

export async function getCategoryBenchmarks(
  range: AnalyticsRange,
  limit = 25,
): Promise<CategoryBenchmarkRow[]> {
  const rows = await prisma.$queryRaw<CategoryBenchmarkSqlRow[]>`
    SELECT
      c.title AS category,
      count(DISTINCT e."contentId")::int AS listings,
      count(*) FILTER (WHERE e."eventType" = 'page_view')::int AS views,
      count(DISTINCT e."visitorId") FILTER (WHERE e."eventType" = 'page_view')::int AS visitors,
      CASE
        WHEN count(DISTINCT e."contentId") > 0
        THEN round(count(*) FILTER (WHERE e."eventType" = 'page_view')::numeric / count(DISTINCT e."contentId"))::int
        ELSE 0
      END AS avg_views
    FROM "AnalyticsEvent" e
    JOIN "ListingCategory" lc ON lc."listingId" = e."contentId"
    JOIN "Category" c ON c.id = lc."categoryId"
    WHERE e."tenantId" = ${TENANT_ID}
      AND e."occurredAt" >= ${range.from}
      AND e."occurredAt" < ${range.to}
      AND e."isBot" = false
      AND e."contentType" = 'listing'
      AND e."contentId" IS NOT NULL
    GROUP BY c.title
    ORDER BY views DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    category: row.category,
    listings: row.listings,
    views: row.views,
    visitors: row.visitors,
    avgViewsPerListing: row.avg_views,
  }));
}

type CompetitorSqlRow = {
  competitor_domain: string;
  keyword: string;
  position: number | null;
  url: string | null;
  date: string;
};

export async function getCompetitorRankings(
  range: AnalyticsRange,
  limit = 100,
): Promise<CompetitorRow[]> {
  const rows = await prisma.$queryRaw<CompetitorSqlRow[]>`
    SELECT
      "competitorDomain" AS competitor_domain,
      keyword,
      position,
      url,
      to_char(date, 'YYYY-MM-DD') AS date
    FROM "CompetitorRankingDaily"
    WHERE "tenantId" = ${TENANT_ID}
      AND "date" >= ${dayKey(range.from)}::date
      AND "date" < ${dayKey(range.to)}::date
    ORDER BY date DESC, position ASC NULLS LAST
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    competitorDomain: row.competitor_domain,
    keyword: row.keyword,
    position: row.position,
    url: row.url,
    date: row.date,
  }));
}

type HealthCountRow = {
  events_today: number;
  pageviews_today: number;
  bot_events_today: number;
};

export async function getTrackingHealth(): Promise<TrackingHealth> {
  const today = startOfUtcDay(new Date());
  const [lastEvent, counts, settings, syncStates, company] = await Promise.all([
    prisma.analyticsEvent.findFirst({
      where: { tenantId: TENANT_ID },
      orderBy: { occurredAt: "desc" },
      select: { occurredAt: true },
    }),
    prisma.$queryRaw<HealthCountRow[]>`
      SELECT
        count(*)::int AS events_today,
        count(*) FILTER (WHERE "eventType" = 'page_view')::int AS pageviews_today,
        count(*) FILTER (WHERE "isBot")::int AS bot_events_today
      FROM "AnalyticsEvent"
      WHERE "tenantId" = ${TENANT_ID}
        AND "occurredAt" >= ${today}
    `,
    getAnalyticsSettingsRecord(),
    prisma.analyticsSyncState.findMany({
      where: { tenantId: TENANT_ID, kind: { in: ["gsc", "dataforseo"] } },
    }),
    prisma.company.findFirst({ where: { tenantId: TENANT_ID } }),
  ]);

  const count = counts[0] ?? { events_today: 0, pageviews_today: 0, bot_events_today: 0 };
  const gscState = syncStates.find((state) => state.kind === "gsc");
  const competitorState = syncStates.find((state) => state.kind === "dataforseo");
  const competitorDomains = Array.isArray(settings.competitorDomains)
    ? settings.competitorDomains
    : [];
  const targetKeywords = Array.isArray(settings.targetKeywords) ? settings.targetKeywords : [];

  return {
    lastEventAt: lastEvent?.occurredAt?.toISOString() ?? null,
    eventsToday: count.events_today,
    pageviewsToday: count.pageviews_today,
    botEventsToday: count.bot_events_today,
    botRateToday:
      count.events_today > 0
        ? Number(((count.bot_events_today / count.events_today) * 100).toFixed(1))
        : 0,
    gscConfigured: Boolean(
      settings.gscSiteUrl &&
        resolveAnalyticsSecret(
          settings.googleServiceAccountEmail,
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        ) &&
        resolveAnalyticsSecret(
          settings.googleServiceAccountPrivateKey,
          process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
        ),
    ),
    gscSiteUrl: settings.gscSiteUrl,
    gscLastSyncAt: gscState?.lastSuccessAt?.toISOString() ?? null,
    gscLastError: gscState?.lastError ?? null,
    competitorConfigured: Boolean(
      competitorDomains.length > 0 &&
        targetKeywords.length > 0 &&
        resolveAnalyticsSecret(settings.dataForSeoLogin, process.env.DATAFORSEO_LOGIN) &&
        resolveAnalyticsSecret(settings.dataForSeoPassword, process.env.DATAFORSEO_PASSWORD),
    ),
    competitorLastSyncAt: competitorState?.lastSuccessAt?.toISOString() ?? null,
    competitorLastError: competitorState?.lastError ?? null,
    ga4: company?.ga4 ?? null,
    gtm: company?.gtm ?? null,
    gscVerificationTag: company?.gscVerificationTag ?? null,
    consentRequired: settings.consentRequired,
    retentionDays: settings.retentionDays,
  };
}
