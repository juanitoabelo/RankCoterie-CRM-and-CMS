CREATE TYPE "ProductLinkType" AS ENUM ('RELATED', 'CROSS_SELL', 'UP_SELL', 'BUNDLE_CHILD', 'GROUPED_CHILD');

CREATE TYPE "ProductReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "ProductLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "linkedProductId" TEXT NOT NULL,
    "type" "ProductLinkType" NOT NULL DEFAULT 'RELATED',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "status" "ProductReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductLink_tenantId_productId_linkedProductId_type_key" ON "ProductLink"("tenantId", "productId", "linkedProductId", "type");

CREATE INDEX "ProductLink_tenantId_productId_type_position_idx" ON "ProductLink"("tenantId", "productId", "type", "position");

CREATE INDEX "ProductLink_tenantId_linkedProductId_idx" ON "ProductLink"("tenantId", "linkedProductId");

CREATE INDEX "ProductReview_tenantId_productId_status_createdAt_idx" ON "ProductReview"("tenantId", "productId", "status", "createdAt");

CREATE INDEX "ProductReview_tenantId_status_idx" ON "ProductReview"("tenantId", "status");

ALTER TABLE "ProductLink" ADD CONSTRAINT "ProductLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductLink" ADD CONSTRAINT "ProductLink_linkedProductId_fkey" FOREIGN KEY ("linkedProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
