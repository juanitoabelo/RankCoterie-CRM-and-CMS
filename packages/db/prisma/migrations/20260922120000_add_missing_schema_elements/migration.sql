-- Migration: Add all missing schema elements
-- Generated manually because Prisma CLI cannot connect to remote Supabase DB

-- =============================================================================
-- 1. MISSING COLUMNS ON EXISTING TABLES
-- =============================================================================

-- Category: add author
ALTER TABLE "Category" ADD COLUMN "author" TEXT;

-- ContentTemplate: add SEO + builder fields
ALTER TABLE "ContentTemplate" ADD COLUMN "author" TEXT;
ALTER TABLE "ContentTemplate" ADD COLUMN "featuredImageAssetId" TEXT;
ALTER TABLE "ContentTemplate" ADD COLUMN "displaySections" JSONB;
ALTER TABLE "ContentTemplate" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "ContentTemplate" ADD COLUMN "metaKeywords" TEXT;
ALTER TABLE "ContentTemplate" ADD COLUMN "focusKeyphrase" TEXT;
ALTER TABLE "ContentTemplate" ADD COLUMN "ogImage" TEXT;
ALTER TABLE "ContentTemplate" ADD COLUMN "canonicalUrl" TEXT;
ALTER TABLE "ContentTemplate" ADD COLUMN "robotsIndex" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ContentTemplate" ADD COLUMN "robotsFollow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ContentTemplate" ADD COLUMN "jsonSchema" TEXT;

-- Page: add SEO + homepage fields
ALTER TABLE "Page" ADD COLUMN "isHomepage" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Page" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "Page" ADD COLUMN "metaDesc" TEXT;
ALTER TABLE "Page" ADD COLUMN "metaKeywords" TEXT;
ALTER TABLE "Page" ADD COLUMN "focusKeyphrase" TEXT;
ALTER TABLE "Page" ADD COLUMN "ogImage" TEXT;
ALTER TABLE "Page" ADD COLUMN "canonicalUrl" TEXT;
ALTER TABLE "Page" ADD COLUMN "robotsIndex" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Page" ADD COLUMN "robotsFollow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Page" ADD COLUMN "jsonSchema" TEXT;

-- Asset: add display fields
ALTER TABLE "Asset" ADD COLUMN "title" TEXT;
ALTER TABLE "Asset" ADD COLUMN "alt" TEXT;
ALTER TABLE "Asset" ADD COLUMN "caption" TEXT;
ALTER TABLE "Asset" ADD COLUMN "width" INTEGER;
ALTER TABLE "Asset" ADD COLUMN "height" INTEGER;

-- Widget: add CTA + social fields
ALTER TABLE "Widget" ADD COLUMN "title" TEXT;
ALTER TABLE "Widget" ADD COLUMN "url" TEXT;
ALTER TABLE "Widget" ADD COLUMN "keywords" TEXT;
ALTER TABLE "Widget" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Widget" ADD COLUMN "ctaDescription" TEXT;
ALTER TABLE "Widget" ADD COLUMN "ctaStatement1" TEXT;
ALTER TABLE "Widget" ADD COLUMN "ctaStatement2" TEXT;
ALTER TABLE "Widget" ADD COLUMN "ctaButtonText" TEXT;
ALTER TABLE "Widget" ADD COLUMN "phone" TEXT;
ALTER TABLE "Widget" ADD COLUMN "usePhoneAsButtonLink" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Widget" ADD COLUMN "facebookUrl" TEXT;
ALTER TABLE "Widget" ADD COLUMN "twitterUrl" TEXT;
ALTER TABLE "Widget" ADD COLUMN "instagramUrl" TEXT;
ALTER TABLE "Widget" ADD COLUMN "youtubeUrl" TEXT;
ALTER TABLE "Widget" ADD COLUMN "pinterestUrl" TEXT;
ALTER TABLE "Widget" ADD COLUMN "linkedinUrl" TEXT;

-- MenuItem: add itemType
ALTER TABLE "MenuItem" ADD COLUMN "itemType" TEXT NOT NULL DEFAULT 'LINK';

-- =============================================================================
-- 2. MISSING TABLES
-- =============================================================================

-- SubTopicSection (join table for ContentTemplate <-> Section)
CREATE TABLE "SubTopicSection" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SubTopicSection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubTopicSection_templateId_sectionId_key" ON "SubTopicSection"("templateId", "sectionId");

-- HeaderFooter
CREATE TABLE "HeaderFooter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeaderFooter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HeaderFooter_tenantId_name_key" ON "HeaderFooter"("tenantId", "name");
CREATE INDEX "HeaderFooter_tenantId_type_idx" ON "HeaderFooter"("tenantId", "type");

-- HeaderFooterRevision
CREATE TABLE "HeaderFooterRevision" (
    "id" TEXT NOT NULL,
    "headerFooterId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeaderFooterRevision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HeaderFooterRevision_headerFooterId_createdAt_idx" ON "HeaderFooterRevision"("headerFooterId", "createdAt");

-- HeaderFooterAssignment
CREATE TABLE "HeaderFooterAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "headerFooterId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "pageId" TEXT,
    "pageType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeaderFooterAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HeaderFooterAssignment_tenantId_headerFooterId_pageId_pageType_key" ON "HeaderFooterAssignment"("tenantId", "headerFooterId", "pageId", "pageType");
CREATE INDEX "HeaderFooterAssignment_tenantId_headerFooterId_idx" ON "HeaderFooterAssignment"("tenantId", "headerFooterId");

-- PageLayout
CREATE TABLE "PageLayout" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageLayout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PageLayout_tenantId_name_key" ON "PageLayout"("tenantId", "name");
CREATE INDEX "PageLayout_tenantId_idx" ON "PageLayout"("tenantId");

-- PageLayoutRevision
CREATE TABLE "PageLayoutRevision" (
    "id" TEXT NOT NULL,
    "pageLayoutId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageLayoutRevision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PageLayoutRevision_pageLayoutId_createdAt_idx" ON "PageLayoutRevision"("pageLayoutId", "createdAt");

-- PageLayoutAssignment
CREATE TABLE "PageLayoutAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pageLayoutId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "pageId" TEXT,
    "pageType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageLayoutAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PageLayoutAssignment_tenantId_pageLayoutId_pageId_pageType_key" ON "PageLayoutAssignment"("tenantId", "pageLayoutId", "pageId", "pageType");
CREATE INDEX "PageLayoutAssignment_tenantId_pageLayoutId_idx" ON "PageLayoutAssignment"("tenantId", "pageLayoutId");

-- =============================================================================
-- 3. MISSING FOREIGN KEYS
-- =============================================================================

-- ContentTemplate -> Asset (featuredImageAssetId)
ALTER TABLE "ContentTemplate" ADD CONSTRAINT "ContentTemplate_featuredImageAssetId_fkey"
    FOREIGN KEY ("featuredImageAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SubTopicSection -> ContentTemplate
ALTER TABLE "SubTopicSection" ADD CONSTRAINT "SubTopicSection_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "ContentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SubTopicSection -> Section
ALTER TABLE "SubTopicSection" ADD CONSTRAINT "SubTopicSection_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- HeaderFooterRevision -> HeaderFooter
ALTER TABLE "HeaderFooterRevision" ADD CONSTRAINT "HeaderFooterRevision_headerFooterId_fkey"
    FOREIGN KEY ("headerFooterId") REFERENCES "HeaderFooter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HeaderFooterAssignment -> HeaderFooter
ALTER TABLE "HeaderFooterAssignment" ADD CONSTRAINT "HeaderFooterAssignment_headerFooterId_fkey"
    FOREIGN KEY ("headerFooterId") REFERENCES "HeaderFooter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PageLayoutRevision -> PageLayout
ALTER TABLE "PageLayoutRevision" ADD CONSTRAINT "PageLayoutRevision_pageLayoutId_fkey"
    FOREIGN KEY ("pageLayoutId") REFERENCES "PageLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PageLayoutAssignment -> PageLayout
ALTER TABLE "PageLayoutAssignment" ADD CONSTRAINT "PageLayoutAssignment_pageLayoutId_fkey"
    FOREIGN KEY ("pageLayoutId") REFERENCES "PageLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Widget -> Company (companyId)
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
