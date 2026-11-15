# Analytics Report — Implementation Plan

## Decisions

1. **Hybrid with first-party as the core.** First-party events are the source of truth; GSC and SEO APIs enrich the data.
2. **Both keyword sources.** Add a public on-site search UI and sync Google Search Console queries.
3. **Both competition sources.** Use local listing peer benchmarks and an optional paid SEO competitor API (DataForSEO).
4. **Privacy-first with consent-aware accuracy.** Use consent-aware first-party IDs with a cookieless fallback.
5. **Full build.** Implement phases 0–4 in this pass.

## Recommendation

Build a native **Admin → System/Tools → Analytics** section rather than embedding GA4. Use:

1. **First-party analytics** for pageviews, events, sessions, content, geo, and conversions.
2. **Google Search Console API** for Google queries, impressions, CTR, average position, and indexing.
3. **DataForSEO** for competitor rankings when credentials are configured.
4. **GA4/GTM** remain marketing tools; they are not the reporting source of truth.

Why:

- Existing stack: Postgres/Supabase, Prisma, Inngest, Recharts, Vercel geo headers.
- Raw, unsampled, tenant-scoped data.
- Supports competitor and content reports GA4 cannot provide.
- Integrates with the existing Tools Permission framework.

## Current State

- GA4, GTM, FB Pixel, and GSC verification render from `Company` fields in `apps/web/app/(site)/layout.tsx`.
- `Listing.viewCount` is incremented on the public listing page.
- `ListingAnalytic` exists but has no write path; it is only read by the admin listing analytics page.
- `recharts` is installed and used by existing reports.
- Inngest jobs live in `packages/jobs/src`.
- Vercel geo headers are already used in `SinglePost.tsx`.
- There is no public site search and no search-query logging.
- There is no first-party pageview/event tracking.
- `apps/web/lib/rate-limit.ts` can protect the collector endpoint.

## Architecture

```text
Public site
  └─ AnalyticsTracker (client)
       └─ POST /api/e   (neutral path to reduce ad-blocker loss)
            ├─ rate limit
            ├─ bot filter
            ├─ UA parsing
            ├─ Vercel geo headers
            ├─ hashed IP
            └─ insert AnalyticsEvent (via after())

Inngest cron
  ├─ analyticsRollup       → daily page/geo/source/search/goal rollups
  ├─ gscSync               → Search Console query data
  ├─ seoCompetitorSync     → DataForSEO competitor rankings
  └─ analyticsMaintenance  → retention purge + listing rollups

Admin
  └─ /admin/analytics/* → server queries → Recharts client components
```

### Implementation notes

- Mount the tracker in `apps/web/app/(site)/layout.tsx`.
- Track route changes with `usePathname`; avoid double-counting initial load and prefetches.
- Use `navigator.sendBeacon` with `fetch(..., { keepalive: true })` fallback.
- Batch events client-side and flush on `pagehide`.
- Exclude `/admin`, `/api`, localhost, preview deployments, and known admins.
- Store parsed device/browser/OS, not raw user-agent.
- Store referrer host/path, not full URLs containing PII.
- Scrub query params like email, token, and auth values.
- Raw events retention: 90 days by default. Rollups: 25 months.
- If volume exceeds ~5–10M events/month, partition raw events by month or move raw storage to ClickHouse/TimescaleDB.

## Data Model

- **`AnalyticsEvent`** — raw event: tenant, event ID, type, session, visitor, path, content, referrer, UTM, geo, device, bot flag, IP hash, engagement, metadata, occurred time.
- **`AnalyticsPageDaily`** — page rollup: views, visitors, sessions, conversions, engagement.
- **`AnalyticsGeoDaily`** — country/region/city rollup.
- **`AnalyticsSourceDaily`** — source/medium/campaign rollup.
- **`AnalyticsSearchDaily`** — internal and GSC query metrics.
- **`AnalyticsGoalDaily`** — conversion rollup.
- **`CompetitorRankingDaily`** — competitor domain rankings from DataForSEO.
- **`AnalyticsSetting`** — GSC property, GA4 property, competitor domains, target keywords, retention, consent, excluded paths.
- **`AnalyticsSyncState`** — last sync, cursor, error for GSC/SEO jobs.

Keep `ListingAnalytic` as a derived listing rollup and refresh it from first-party events.

## Dashboard Information Architecture

1. **Overview** — visitors, pageviews, sessions, conversions, trend chart, top pages, top sources, top countries, real-time.
2. **Traffic** — time series, new vs returning, device, browser, channel, campaign.
3. **Content** — top pages/posts/products/listings, entry/exit, engagement, conversions by content type.
4. **Search** — GSC queries, impressions, clicks, CTR, position; internal search queries and zero-result queries.
5. **Geo** — country, state/region, city, map or table.
6. **Acquisition** — referrers, UTM breakdown, organic vs direct vs paid vs social.
7. **Conversions** — goals, funnels, lead sources, revenue attribution.
8. **Competition** — local peer benchmarks, competitor visibility, keyword overlap, content gaps.
9. **Tracking Health** — last event, bot ratio, consent rate, GA4/GSC connection status, data freshness.
10. **Settings** — tracking IDs, consent, retention, excluded paths, competitor domains, keyword lists.

The section is named **Analytics** because `/admin/reports` already exists. Add `analytics` to `apps/web/modules/auth/tools.ts` with default access for `SUPER_ADMIN`, `ADMIN`, and `MARKETING`.

## Competition and Keywords

### Competition

Competitor traffic cannot be measured directly. Implement:

- **Local peer benchmarks** — compare listing views/leads against category/region peers. Free and unique.
- **SEO visibility** — track competitor rankings for target keywords via DataForSEO. Paid and optional.
- **Traffic estimates** — Similarweb API. Not included by default.
- **Google Trends** — free but limited. Not included by default.

### Keywords

- **Google queries** — Search Console API.
- **On-site search queries** — public search UI plus first-party logging.
- **Keyword volumes** — Google Ads API or DataForSEO. Not included by default.

## Privacy and Compliance

- Consent banner with grant/decline choice.
- Respect GPC/DNT.
- GA4 consent mode remains a marketing concern.
- Hash IP addresses with a daily rotating salt; never store raw IPs.
- Do not store PII in paths, referrers, or query strings.
- Exclude admins, preview deployments, and localhost.
- Flag bots instead of silently dropping them.
- Retention settings and data deletion path.
- Document retention in admin settings.

## Phases

| Phase | Scope | Deliverables |
|---|---|---|
| **0. Decisions + skeleton** | Confirm sources, privacy, competition; add analytics section | Permission skeleton, route placeholders, schema draft |
| **1. First-party MVP** | Tracker, collector, raw events, bot/geo/UA enrichment, retention | Pageviews, sessions, geo, top pages, real-time |
| **2. Rollups + dashboards** | Inngest rollups, daily tables, filters, date ranges, CSV export | Traffic, Content, Geo, Acquisition dashboards |
| **3. GSC + GA4** | Service account, GSC sync, optional GA4 Data API import | Search queries, impressions, CTR, position, tracking health |
| **4. Competition + alerts** | Local peer benchmarks, optional SEO API, anomaly alerts, scheduled reports | Competition dashboard, alerts, weekly digest |
| **5. Advanced** | Funnels, cohorts, session replay, Core Web Vitals, AI summaries | Optional |

## Better Features

- Content decay report.
- SEO opportunities: high impressions/low CTR and striking-distance keywords.
- Keyword cannibalization.
- Local market share for listings.
- Lead quality by source and revenue attribution.
- Cohort retention.
- Anomaly alerts.
- Site search insights and content gaps.
- Core Web Vitals by page.
- Crawler activity.
- UTM builder and goal builder.
- Saved segments and period comparisons.
- White-label client reports.
- AI weekly summaries.

## Risks and Costs

- **Supabase connection limits** — batch inserts and rely on rollups; move raw events to ClickHouse if volume grows.
- **Ad blockers** — use a neutral collector path and first-party domain.
- **Consent loss** — first-party analytics will undercount; document it.
- **GA4 sampling** — not the source of truth for detailed reports.
- **SEO API costs** — DataForSEO is pay-as-you-go; Semrush/Ahrefs are subscription-heavy.
- **Competition data is estimated** — label it clearly.
- **Scope creep** — ship Overview + Content + Geo + Search first.

## Required Environment Variables

```bash
# Optional: Google Search Console sync
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=

# Optional: DataForSEO competitor rankings
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=

# Optional: consent banner default (can also be changed in Analytics Settings)
NEXT_PUBLIC_ANALYTICS_CONSENT_REQUIRED=false
```
