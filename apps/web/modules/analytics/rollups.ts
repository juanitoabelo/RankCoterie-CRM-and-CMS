import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { CONVERSION_EVENTS } from "./constants";
import { getAnalyticsSettings } from "./settings";

const CONVERSION_LIST = Prisma.raw(
  CONVERSION_EVENTS.map((event) => `'${event}'`).join(","),
);

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dayString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function rollupAnalyticsDay(date: Date): Promise<void> {
  const start = startOfUtcDay(date);
  const end = addDays(start, 1);
  const day = dayString(start);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM "AnalyticsPageDaily"
      WHERE "tenantId" = ${TENANT_ID} AND "date" = ${day}::date
    `;
    await tx.$executeRaw`
      INSERT INTO "AnalyticsPageDaily"
        ("id","tenantId","date","path","title","contentType","contentId","views","visitors","sessions","conversions","avgDurationMs","avgScrollDepth","bounceRate","createdAt","updatedAt")
      SELECT
        concat('apd_', md5(random()::text || clock_timestamp()::text)),
        e."tenantId",
        ${day}::date,
        e.path,
        max(e.title),
        max(e."contentType"),
        max(e."contentId"),
        count(*) FILTER (WHERE e."eventType" = 'page_view'),
        count(DISTINCT e."visitorId") FILTER (WHERE e."eventType" = 'page_view'),
        count(DISTINCT e."sessionId") FILTER (WHERE e."eventType" = 'page_view'),
        count(*) FILTER (WHERE e."eventType" IN (${CONVERSION_LIST})),
        coalesce(round(avg(e."durationMs") FILTER (WHERE e."eventType" = 'engagement'))::int, 0),
        coalesce(round(avg(e."scrollDepth") FILTER (WHERE e."eventType" = 'engagement'))::int, 0),
        0,
        now(),
        now()
      FROM "AnalyticsEvent" e
      WHERE e."tenantId" = ${TENANT_ID}
        AND e."occurredAt" >= ${start}
        AND e."occurredAt" < ${end}
        AND e."isBot" = false
      GROUP BY e."tenantId", e.path
    `;

    await tx.$executeRaw`
      DELETE FROM "AnalyticsGeoDaily"
      WHERE "tenantId" = ${TENANT_ID} AND "date" = ${day}::date
    `;
    await tx.$executeRaw`
      INSERT INTO "AnalyticsGeoDaily"
        ("id","tenantId","date","country","region","city","views","visitors","sessions","createdAt","updatedAt")
      SELECT
        concat('agd_', md5(random()::text || clock_timestamp()::text)),
        e."tenantId",
        ${day}::date,
        coalesce(e.country, ''),
        coalesce(e.region, ''),
        coalesce(e.city, ''),
        count(*) FILTER (WHERE e."eventType" = 'page_view'),
        count(DISTINCT e."visitorId") FILTER (WHERE e."eventType" = 'page_view'),
        count(DISTINCT e."sessionId") FILTER (WHERE e."eventType" = 'page_view'),
        now(),
        now()
      FROM "AnalyticsEvent" e
      WHERE e."tenantId" = ${TENANT_ID}
        AND e."occurredAt" >= ${start}
        AND e."occurredAt" < ${end}
        AND e."isBot" = false
      GROUP BY e."tenantId", e.country, e.region, e.city
    `;

    await tx.$executeRaw`
      DELETE FROM "AnalyticsSourceDaily"
      WHERE "tenantId" = ${TENANT_ID} AND "date" = ${day}::date
    `;
    await tx.$executeRaw`
      INSERT INTO "AnalyticsSourceDaily"
        ("id","tenantId","date","source","medium","campaign","views","visitors","sessions","conversions","createdAt","updatedAt")
      SELECT
        concat('asd_', md5(random()::text || clock_timestamp()::text)),
        e."tenantId",
        ${day}::date,
        coalesce(nullif(e.source, ''), 'direct'),
        coalesce(nullif(e.medium, ''), 'none'),
        coalesce(e.campaign, ''),
        count(*) FILTER (WHERE e."eventType" = 'page_view'),
        count(DISTINCT e."visitorId") FILTER (WHERE e."eventType" = 'page_view'),
        count(DISTINCT e."sessionId") FILTER (WHERE e."eventType" = 'page_view'),
        count(*) FILTER (WHERE e."eventType" IN (${CONVERSION_LIST})),
        now(),
        now()
      FROM "AnalyticsEvent" e
      WHERE e."tenantId" = ${TENANT_ID}
        AND e."occurredAt" >= ${start}
        AND e."occurredAt" < ${end}
        AND e."isBot" = false
      GROUP BY e."tenantId", e.source, e.medium, e.campaign
    `;

    await tx.$executeRaw`
      DELETE FROM "AnalyticsSearchDaily"
      WHERE "tenantId" = ${TENANT_ID} AND "date" = ${day}::date AND "source" = 'internal'
    `;
    await tx.$executeRaw`
      INSERT INTO "AnalyticsSearchDaily"
        ("id","tenantId","date","source","query","page","country","device","impressions","clicks","ctr","position","resultsCount","zeroResults","createdAt","updatedAt")
      SELECT
        concat('asearch_', md5(random()::text || clock_timestamp()::text)),
        e."tenantId",
        ${day}::date,
        'internal',
        coalesce(e.metadata->>'query', ''),
        '',
        '',
        '',
        count(*),
        0,
        0,
        0,
        coalesce(round(avg(CASE WHEN e.metadata->>'results' ~ '^[0-9]+$' THEN (e.metadata->>'results')::numeric ELSE 0 END))::int, 0),
        count(*) FILTER (WHERE CASE WHEN e.metadata->>'results' ~ '^[0-9]+$' THEN (e.metadata->>'results')::int ELSE 0 END = 0),
        now(),
        now()
      FROM "AnalyticsEvent" e
      WHERE e."tenantId" = ${TENANT_ID}
        AND e."occurredAt" >= ${start}
        AND e."occurredAt" < ${end}
        AND e."eventType" = 'search'
        AND coalesce(e.metadata->>'query', '') <> ''
      GROUP BY e."tenantId", e.metadata->>'query'
    `;

    await tx.$executeRaw`
      DELETE FROM "AnalyticsGoalDaily"
      WHERE "tenantId" = ${TENANT_ID} AND "date" = ${day}::date
    `;
    await tx.$executeRaw`
      INSERT INTO "AnalyticsGoalDaily"
        ("id","tenantId","date","goal","conversions","revenue","createdAt","updatedAt")
      SELECT
        concat('ag_', md5(random()::text || clock_timestamp()::text)),
        e."tenantId",
        ${day}::date,
        e."eventType",
        count(*),
        0,
        now(),
        now()
      FROM "AnalyticsEvent" e
      WHERE e."tenantId" = ${TENANT_ID}
        AND e."occurredAt" >= ${start}
        AND e."occurredAt" < ${end}
        AND e."eventType" IN (${CONVERSION_LIST})
        AND e."isBot" = false
      GROUP BY e."tenantId", e."eventType"
    `;

    await tx.$executeRaw`
      DELETE FROM "ListingAnalytic"
      WHERE "tenantId" = ${TENANT_ID} AND "date" = ${day}::date
    `;
    await tx.$executeRaw`
      INSERT INTO "ListingAnalytic"
        ("id","tenantId","listingId","date","views","clicks","leads","calls","emails","directions","websiteClicks","createdAt")
      SELECT
        concat('la_', md5(random()::text || clock_timestamp()::text)),
        e."tenantId",
        e."contentId",
        ${day}::date,
        count(*) FILTER (WHERE e."eventType" = 'page_view'),
        count(*) FILTER (WHERE e."eventType" = 'cta_click'),
        count(*) FILTER (WHERE e."eventType" = 'lead_submit'),
        count(*) FILTER (WHERE e."eventType" = 'phone_click'),
        count(*) FILTER (WHERE e."eventType" = 'email_click'),
        count(*) FILTER (WHERE e."eventType" = 'directions_click'),
        count(*) FILTER (WHERE e."eventType" = 'website_click'),
        now()
      FROM "AnalyticsEvent" e
      WHERE e."tenantId" = ${TENANT_ID}
        AND e."occurredAt" >= ${start}
        AND e."occurredAt" < ${end}
        AND e."isBot" = false
        AND e."contentType" = 'listing'
        AND e."contentId" IS NOT NULL
      GROUP BY e."tenantId", e."contentId"
      ON CONFLICT ("listingId", "date") DO UPDATE SET
        "views" = EXCLUDED."views",
        "clicks" = EXCLUDED."clicks",
        "leads" = EXCLUDED."leads",
        "calls" = EXCLUDED."calls",
        "emails" = EXCLUDED."emails",
        "directions" = EXCLUDED."directions",
        "websiteClicks" = EXCLUDED."websiteClicks"
    `;
  });
}

export async function rollupAnalyticsRange(days: number): Promise<void> {
  const today = startOfUtcDay(new Date());
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    await rollupAnalyticsDay(addDays(today, -offset));
  }
}

export async function purgeOldAnalytics(retentionDays: number): Promise<number> {
  const cutoff = addDays(new Date(), -Math.max(1, retentionDays));
  const rollupCutoff = addDays(new Date(), -760);

  const deleted = await prisma.analyticsEvent.deleteMany({
    where: { tenantId: TENANT_ID, occurredAt: { lt: cutoff } },
  });

  await Promise.all([
    prisma.analyticsPageDaily.deleteMany({ where: { tenantId: TENANT_ID, date: { lt: rollupCutoff } } }),
    prisma.analyticsGeoDaily.deleteMany({ where: { tenantId: TENANT_ID, date: { lt: rollupCutoff } } }),
    prisma.analyticsSourceDaily.deleteMany({ where: { tenantId: TENANT_ID, date: { lt: rollupCutoff } } }),
    prisma.analyticsSearchDaily.deleteMany({ where: { tenantId: TENANT_ID, date: { lt: rollupCutoff } } }),
    prisma.analyticsGoalDaily.deleteMany({ where: { tenantId: TENANT_ID, date: { lt: rollupCutoff } } }),
  ]);

  return deleted.count;
}

export async function runAnalyticsMaintenance(): Promise<{
  rolledUpDays: number;
  purged: number;
  retentionDays: number;
}> {
  const settings = await getAnalyticsSettings();
  await rollupAnalyticsRange(2);
  const purged = await purgeOldAnalytics(settings.retentionDays);
  await prisma.analyticsSyncState.upsert({
    where: { tenantId_kind: { tenantId: TENANT_ID, kind: "rollup" } },
    update: { lastRunAt: new Date(), lastSuccessAt: new Date(), lastError: null },
    create: {
      tenantId: TENANT_ID,
      kind: "rollup",
      lastRunAt: new Date(),
      lastSuccessAt: new Date(),
    },
  });
  return { rolledUpDays: 2, purged, retentionDays: settings.retentionDays };
}
