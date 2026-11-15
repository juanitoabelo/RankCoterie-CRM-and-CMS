export type AnalyticsEventInput = {
  eventId?: string;
  eventType?: string;
  sessionId?: string;
  visitorId?: string;
  path?: string;
  title?: string;
  contentType?: string;
  contentId?: string;
  referrer?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  durationMs?: number;
  scrollDepth?: number;
  metadata?: Record<string, unknown>;
  occurredAt?: string | number | Date;
};

export type AnalyticsRange = {
  days: number;
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
};

export type AnalyticsSummary = {
  pageviews: number;
  visitors: number;
  sessions: number;
  conversions: number;
  bounceRate: number;
  avgDurationMs: number;
  avgScrollDepth: number;
  botEvents: number;
  totalEvents: number;
  botRate: number;
  previous: {
    pageviews: number;
    visitors: number;
    sessions: number;
    conversions: number;
  };
};

export type TimeSeriesPoint = {
  date: string;
  label: string;
  pageviews: number;
  visitors: number;
  sessions: number;
  conversions: number;
};

export type TopPageRow = {
  path: string;
  title: string | null;
  contentType: string | null;
  contentId: string | null;
  views: number;
  visitors: number;
  conversions: number;
};

export type ContentTypeRow = {
  contentType: string;
  views: number;
  visitors: number;
};

export type GeoRow = {
  country: string;
  region: string;
  city: string;
  views: number;
  visitors: number;
};

export type SourceRow = {
  source: string;
  medium: string;
  campaign: string;
  views: number;
  visitors: number;
  conversions: number;
};

export type ReferrerRow = {
  referrerHost: string;
  views: number;
  visitors: number;
};

export type DeviceRow = {
  label: string;
  views: number;
  visitors: number;
};

export type SearchQueryRow = {
  query: string;
  source: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  resultsCount: number;
  zeroResults: number;
};

export type SearchSummary = {
  gscClicks: number;
  gscImpressions: number;
  gscCtr: number;
  gscPosition: number;
  internalSearches: number;
  zeroResultSearches: number;
  uniqueQueries: number;
};

export type ListingPeerRow = {
  listingId: string;
  title: string;
  slug: string;
  city: string | null;
  state: string | null;
  views: number;
  visitors: number;
  leads: number;
  totalViews: number;
  totalLeads: number;
};

export type CategoryBenchmarkRow = {
  category: string;
  listings: number;
  views: number;
  visitors: number;
  avgViewsPerListing: number;
};

export type CompetitorRow = {
  competitorDomain: string;
  keyword: string;
  position: number | null;
  url: string | null;
  date: string;
};

export type TrackingHealth = {
  lastEventAt: string | null;
  eventsToday: number;
  pageviewsToday: number;
  botEventsToday: number;
  botRateToday: number;
  gscConfigured: boolean;
  gscSiteUrl: string | null;
  gscLastSyncAt: string | null;
  gscLastError: string | null;
  competitorConfigured: boolean;
  competitorLastSyncAt: string | null;
  competitorLastError: string | null;
  ga4: string | null;
  gtm: string | null;
  gscVerificationTag: string | null;
  consentRequired: boolean;
  retentionDays: number;
};

export type AnalyticsSettingsData = {
  enabled: boolean;
  gscSiteUrl: string;
  ga4PropertyId: string;
  competitorDomains: string[];
  targetKeywords: string[];
  retentionDays: number;
  consentRequired: boolean;
  excludedPaths: string[];
};

export type AnalyticsSecretStatus = {
  googleServiceAccountEmail: string;
  hasGoogleServiceAccountPrivateKey: boolean;
  dataForSeoLogin: string;
  hasDataForSeoPassword: boolean;
  env: {
    googleServiceAccountEmail: boolean;
    googleServiceAccountPrivateKey: boolean;
    dataForSeoLogin: boolean;
    dataForSeoPassword: boolean;
    enabled: boolean;
    consentRequired: boolean;
  };
};

export type AnalyticsSecretsInput = {
  googleServiceAccountEmail?: string | null;
  googleServiceAccountPrivateKey?: string | null;
  dataForSeoLogin?: string | null;
  dataForSeoPassword?: string | null;
};

export type SyncResult = {
  ok: boolean;
  skipped?: boolean;
  message: string;
  rows?: number;
};
