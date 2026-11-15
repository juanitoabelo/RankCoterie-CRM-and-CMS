-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "path" TEXT NOT NULL,
    "host" TEXT,
    "title" TEXT,
    "contentType" TEXT,
    "contentId" TEXT,
    "referrer" TEXT,
    "referrerHost" TEXT,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "term" TEXT,
    "content" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "botName" TEXT,
    "ipHash" TEXT,
    "durationMs" INTEGER,
    "scrollDepth" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsPageDaily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "contentType" TEXT,
    "contentId" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "avgDurationMs" INTEGER NOT NULL DEFAULT 0,
    "avgScrollDepth" INTEGER NOT NULL DEFAULT 0,
    "bounceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsPageDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsGeoDaily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "country" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "views" INTEGER NOT NULL DEFAULT 0,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsGeoDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSourceDaily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "medium" TEXT NOT NULL DEFAULT '',
    "campaign" TEXT NOT NULL DEFAULT '',
    "views" INTEGER NOT NULL DEFAULT 0,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsSourceDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSearchDaily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'internal',
    "query" TEXT NOT NULL,
    "page" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "device" TEXT NOT NULL DEFAULT '',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resultsCount" INTEGER NOT NULL DEFAULT 0,
    "zeroResults" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsSearchDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsGoalDaily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "goal" TEXT NOT NULL,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsGoalDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorRankingDaily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "competitorDomain" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "position" INTEGER,
    "url" TEXT,
    "country" TEXT NOT NULL DEFAULT '',
    "device" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'dataforseo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorRankingDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gscSiteUrl" TEXT,
    "ga4PropertyId" TEXT,
    "competitorDomains" JSONB NOT NULL DEFAULT '[]',
    "targetKeywords" JSONB NOT NULL DEFAULT '[]',
    "retentionDays" INTEGER NOT NULL DEFAULT 90,
    "consentRequired" BOOLEAN NOT NULL DEFAULT false,
    "excludedPaths" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSyncState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "cursor" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsEvent_eventId_key" ON "AnalyticsEvent"("eventId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_occurredAt_idx" ON "AnalyticsEvent"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_eventType_occurredAt_idx" ON "AnalyticsEvent"("tenantId", "eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_path_occurredAt_idx" ON "AnalyticsEvent"("tenantId", "path", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_visitorId_occurredAt_idx" ON "AnalyticsEvent"("tenantId", "visitorId", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_country_occurredAt_idx" ON "AnalyticsEvent"("tenantId", "country", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_source_occurredAt_idx" ON "AnalyticsEvent"("tenantId", "source", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_contentType_contentId_occurredAt_idx" ON "AnalyticsEvent"("tenantId", "contentType", "contentId", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsPageDaily_tenantId_date_idx" ON "AnalyticsPageDaily"("tenantId", "date");

-- CreateIndex
CREATE INDEX "AnalyticsPageDaily_tenantId_contentType_contentId_date_idx" ON "AnalyticsPageDaily"("tenantId", "contentType", "contentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsPageDaily_tenantId_date_path_key" ON "AnalyticsPageDaily"("tenantId", "date", "path");

-- CreateIndex
CREATE INDEX "AnalyticsGeoDaily_tenantId_date_idx" ON "AnalyticsGeoDaily"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsGeoDaily_tenantId_date_country_region_city_key" ON "AnalyticsGeoDaily"("tenantId", "date", "country", "region", "city");

-- CreateIndex
CREATE INDEX "AnalyticsSourceDaily_tenantId_date_idx" ON "AnalyticsSourceDaily"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSourceDaily_tenantId_date_source_medium_campaign_key" ON "AnalyticsSourceDaily"("tenantId", "date", "source", "medium", "campaign");

-- CreateIndex
CREATE INDEX "AnalyticsSearchDaily_tenantId_date_source_idx" ON "AnalyticsSearchDaily"("tenantId", "date", "source");

-- CreateIndex
CREATE INDEX "AnalyticsSearchDaily_tenantId_query_idx" ON "AnalyticsSearchDaily"("tenantId", "query");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSearchDaily_tenantId_date_source_query_page_countr_key" ON "AnalyticsSearchDaily"("tenantId", "date", "source", "query", "page", "country", "device");

-- CreateIndex
CREATE INDEX "AnalyticsGoalDaily_tenantId_date_idx" ON "AnalyticsGoalDaily"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsGoalDaily_tenantId_date_goal_key" ON "AnalyticsGoalDaily"("tenantId", "date", "goal");

-- CreateIndex
CREATE INDEX "CompetitorRankingDaily_tenantId_date_idx" ON "CompetitorRankingDaily"("tenantId", "date");

-- CreateIndex
CREATE INDEX "CompetitorRankingDaily_tenantId_competitorDomain_date_idx" ON "CompetitorRankingDaily"("tenantId", "competitorDomain", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorRankingDaily_tenantId_date_competitorDomain_keywo_key" ON "CompetitorRankingDaily"("tenantId", "date", "competitorDomain", "keyword", "country", "device", "source");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSetting_tenantId_key" ON "AnalyticsSetting"("tenantId");

-- CreateIndex
CREATE INDEX "AnalyticsSyncState_tenantId_idx" ON "AnalyticsSyncState"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSyncState_tenantId_kind_key" ON "AnalyticsSyncState"("tenantId", "kind");
