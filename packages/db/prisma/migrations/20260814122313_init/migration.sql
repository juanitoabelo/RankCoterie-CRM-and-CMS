-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MARKETING', 'GRACE_COACH', 'REVIEWER', 'SALES_REP');

-- CreateEnum
CREATE TYPE "AreaPart" AS ENUM ('ALL', 'NORTHERN', 'SOUTHERN', 'EASTERN', 'WESTERN', 'CENTRAL');

-- CreateEnum
CREATE TYPE "ListingTier" AS ENUM ('SUPPRESSED', 'FREE', 'STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'LIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'DISABLED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domainKey" TEXT NOT NULL,
    "theme" JSONB NOT NULL DEFAULT '{}',
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "department" TEXT,
    "isRep" BOOLEAN NOT NULL DEFAULT false,
    "isCloser" BOOLEAN NOT NULL DEFAULT false,
    "authorUrl" TEXT,
    "authorBio" TEXT,
    "imageUrl" TEXT,
    "jobTitle" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'all',

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "stateFull" TEXT NOT NULL,
    "city" TEXT,
    "areaPart" "AreaPart",
    "slug" TEXT NOT NULL,
    "custom1" TEXT,
    "custom2" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 999,
    "zipCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "stateInit" TEXT,
    "stateDesc" TEXT,
    "cityInit" TEXT,
    "cityDesc" TEXT,
    "altIntros" JSONB,
    "sections" JSONB,
    "status" TEXT NOT NULL DEFAULT 'LIVE',

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryRegionContent" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "areaPart" "AreaPart" NOT NULL DEFAULT 'NORTHERN',
    "customText" TEXT NOT NULL,

    CONSTRAINT "CategoryRegionContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryRegionFeed" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "areaPart" "AreaPart" NOT NULL DEFAULT 'NORTHERN',
    "feedId" TEXT NOT NULL,

    CONSTRAINT "CategoryRegionFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tier" "ListingTier" NOT NULL DEFAULT 'FREE',
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domainKey" TEXT,
    "contentHtml" TEXT,
    "keywords" TEXT,
    "description" TEXT,
    "isArticlePage" BOOLEAN NOT NULL DEFAULT false,
    "articleTemplate" TEXT,
    "isLandingPage" BOOLEAN NOT NULL DEFAULT false,
    "freeGraceUntil" TIMESTAMP(3),
    "companyId" TEXT,
    "companyName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "avatarImage" TEXT,
    "feedImage" TEXT,
    "videoUrl" TEXT,
    "summary" TEXT,
    "staff" TEXT,
    "clientFocus" TEXT,
    "credentials" TEXT,
    "isSlidingScale" BOOLEAN NOT NULL DEFAULT false,
    "freeInitial" BOOLEAN NOT NULL DEFAULT false,
    "acceptsPayment" JSONB NOT NULL DEFAULT '{}',
    "hasMalpractice" BOOLEAN NOT NULL DEFAULT false,
    "social" JSONB NOT NULL DEFAULT '{}',
    "ageGroups" JSONB NOT NULL DEFAULT '{}',
    "clientGender" TEXT,
    "religion" TEXT,
    "languages" JSONB NOT NULL DEFAULT '[]',
    "pricing" JSONB NOT NULL DEFAULT '{}',
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingCategory" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ListingCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingRegion" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,

    CONSTRAINT "ListingRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExcludedCompany" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "domainKey" TEXT,
    "listingId" TEXT,
    "reason" TEXT,
    "addedById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExcludedCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingSubscription" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "tier" "ListingTier" NOT NULL,
    "status" "ListingStatus" NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "priceId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "paymentGraceUntil" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metaDesc" TEXT,
    "categoryId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVariant" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feed" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domainKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Feed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedItem" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "body" TEXT,
    "author" TEXT,
    "keywords" TEXT,
    "feedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchArticle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "listingId" TEXT,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "domainKey" TEXT,
    "metaDesc" TEXT,
    "tags" TEXT,
    "feedImage" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isRejected" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "postDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phones" JSONB NOT NULL DEFAULT '{}',
    "addresses" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "disposition" TEXT,
    "initialDisposition" TEXT,
    "statusDate" TIMESTAMP(3),
    "lastModified" TIMESTAMP(3) NOT NULL,
    "assignedToId" TEXT,
    "closeUserId" TEXT,
    "campaignId" TEXT,
    "productId" TEXT,
    "publisherId" TEXT,
    "subId" TEXT,
    "clickId" TEXT,
    "landingPageId" TEXT,
    "intake" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadNote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToDo" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "assigneeId" TEXT,
    "text" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToDo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phones" JSONB NOT NULL DEFAULT '{}',
    "addresses" JSONB NOT NULL DEFAULT '{}',
    "maskedCard" TEXT,
    "leadId" TEXT,
    "campaignId" TEXT,
    "productId" TEXT,
    "publisherId" TEXT,
    "subId" TEXT,
    "clickId" TEXT,
    "landingPageId" TEXT,
    "isPartial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "chargeDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "interval" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "stripePaymentId" TEXT,
    "responseMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" TEXT,
    "data" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domainKey_key" ON "Tenant"("domainKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Region_slug_key" ON "Region"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_tenantId_slug_key" ON "Category"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryRegionContent_categoryId_state_areaPart_key" ON "CategoryRegionContent"("categoryId", "state", "areaPart");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");

-- CreateIndex
CREATE INDEX "Listing_tenantId_tier_status_idx" ON "Listing"("tenantId", "tier", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ListingCategory_listingId_categoryId_key" ON "ListingCategory"("listingId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingRegion_listingId_regionId_key" ON "ListingRegion"("listingId", "regionId");

-- CreateIndex
CREATE INDEX "ExcludedCompany_tenantId_isActive_idx" ON "ExcludedCompany"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ListingSubscription_listingId_key" ON "ListingSubscription"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingSubscription_stripeSubId_key" ON "ListingSubscription"("stripeSubId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVariant_templateId_regionId_key" ON "ContentVariant"("templateId", "regionId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entity_entityId_idx" ON "AuditLog"("tenantId", "entity", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRegionContent" ADD CONSTRAINT "CategoryRegionContent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRegionFeed" ADD CONSTRAINT "CategoryRegionFeed_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRegionFeed" ADD CONSTRAINT "CategoryRegionFeed_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingCategory" ADD CONSTRAINT "ListingCategory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingRegion" ADD CONSTRAINT "ListingRegion_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingSubscription" ADD CONSTRAINT "ListingSubscription_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVariant" ADD CONSTRAINT "ContentVariant_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedItem" ADD CONSTRAINT "FeedItem_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchArticle" ADD CONSTRAINT "SearchArticle_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToDo" ADD CONSTRAINT "ToDo_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
