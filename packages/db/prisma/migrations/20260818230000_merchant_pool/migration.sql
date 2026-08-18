-- Phase 3c: Stripe Connect merchant pool (legacy §4.6).
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "listingId" TEXT,
    "stripeAccountId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "payoutMethod" TEXT,
    "feePercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- Listing ↔ merchant operator link.
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;