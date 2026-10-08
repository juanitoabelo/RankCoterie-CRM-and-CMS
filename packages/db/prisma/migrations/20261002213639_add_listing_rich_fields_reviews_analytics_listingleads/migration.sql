-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "amenities" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "badges" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "canonicalUrl" TEXT,
ADD COLUMN     "certifications" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "claimedById" TEXT,
ADD COLUMN     "clickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "featuredPosition" INTEGER,
ADD COLUMN     "featuredSlots" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "featuredUntil" TIMESTAMP(3),
ADD COLUMN     "focusKeyphrase" TEXT,
ADD COLUMN     "galleryImages" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "hoursOfOperation" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "insuranceAccepted" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "jsonSchema" TEXT,
ADD COLUMN     "lastViewedAt" TIMESTAMP(3),
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "leadAutoResponder" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "leadCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leadEmail" TEXT,
ADD COLUMN     "leadFormFields" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "leadNotificationEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "leadNotificationSms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leadPhone" TEXT,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "metaDesc" TEXT,
ADD COLUMN     "ogImage" TEXT,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "robotsFollow" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "specialties" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "verificationExpires" TIMESTAMP(3),
ADD COLUMN     "verificationToken" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedFields" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingAnalytic" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "emails" INTEGER NOT NULL DEFAULT 0,
    "directions" INTEGER NOT NULL DEFAULT 0,
    "websiteClicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingAnalytic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingLead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "listingId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "subject" TEXT,
    "source" TEXT NOT NULL DEFAULT 'listing',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assignedToId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_tenantId_listingId_idx" ON "Review"("tenantId", "listingId");

-- CreateIndex
CREATE INDEX "Review_tenantId_status_idx" ON "Review"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Review_listingId_status_idx" ON "Review"("listingId", "status");

-- CreateIndex
CREATE INDEX "ListingAnalytic_tenantId_date_idx" ON "ListingAnalytic"("tenantId", "date");

-- CreateIndex
CREATE INDEX "ListingAnalytic_listingId_date_idx" ON "ListingAnalytic"("listingId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ListingAnalytic_listingId_date_key" ON "ListingAnalytic"("listingId", "date");

-- CreateIndex
CREATE INDEX "ListingLead_tenantId_listingId_idx" ON "ListingLead"("tenantId", "listingId");

-- CreateIndex
CREATE INDEX "ListingLead_tenantId_status_idx" ON "ListingLead"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ListingLead_tenantId_createdAt_idx" ON "ListingLead"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_tenantId_slug_idx" ON "Listing"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "Listing_tenantId_city_state_idx" ON "Listing"("tenantId", "city", "state");

-- CreateIndex
CREATE INDEX "Listing_tenantId_claimedById_idx" ON "Listing"("tenantId", "claimedById");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAnalytic" ADD CONSTRAINT "ListingAnalytic_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingLead" ADD CONSTRAINT "ListingLead_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
