-- CreateEnum
CREATE TYPE "FeaturedPlacementType" AS ENUM ('HOME_HERO', 'HOME_FEATURED', 'CATEGORY_TOP', 'CATEGORY_FEATURED', 'REGION_SPOTLIGHT', 'SEARCH_TOP');

-- CreateEnum
CREATE TYPE "FeaturedPlacementStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "FeaturedPlacement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "FeaturedPlacementType" NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "priceQuarterly" DOUBLE PRECISION,
    "priceAnnually" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "maxSlots" INTEGER NOT NULL DEFAULT 1,
    "currentSlots" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "regionId" TEXT,
    "status" "FeaturedPlacementStatus" NOT NULL DEFAULT 'AVAILABLE',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturedPlacementPurchase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "pricePaid" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingInterval" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "position" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedPlacementPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeaturedPlacement_tenantId_type_status_idx" ON "FeaturedPlacement"("tenantId", "type", "status");

-- CreateIndex
CREATE INDEX "FeaturedPlacement_tenantId_categoryId_regionId_idx" ON "FeaturedPlacement"("tenantId", "categoryId", "regionId");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedPlacement_tenantId_slug_key" ON "FeaturedPlacement"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedPlacementPurchase_stripeSubscriptionId_key" ON "FeaturedPlacementPurchase"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "FeaturedPlacementPurchase_tenantId_listingId_idx" ON "FeaturedPlacementPurchase"("tenantId", "listingId");

-- CreateIndex
CREATE INDEX "FeaturedPlacementPurchase_tenantId_placementId_idx" ON "FeaturedPlacementPurchase"("tenantId", "placementId");

-- CreateIndex
CREATE INDEX "FeaturedPlacementPurchase_stripeSubscriptionId_idx" ON "FeaturedPlacementPurchase"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "FeaturedPlacement" ADD CONSTRAINT "FeaturedPlacement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedPlacement" ADD CONSTRAINT "FeaturedPlacement_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedPlacementPurchase" ADD CONSTRAINT "FeaturedPlacementPurchase_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "FeaturedPlacement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedPlacementPurchase" ADD CONSTRAINT "FeaturedPlacementPurchase_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
