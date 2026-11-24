CREATE TABLE "DigitalDownloadGrant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "downloadLimit" INTEGER,
    "downloadsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalDownloadGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DigitalDownloadGrant_token_key" ON "DigitalDownloadGrant"("token");
CREATE INDEX "DigitalDownloadGrant_tenantId_orderId_idx" ON "DigitalDownloadGrant"("tenantId", "orderId");
CREATE INDEX "DigitalDownloadGrant_tenantId_orderItemId_idx" ON "DigitalDownloadGrant"("tenantId", "orderItemId");

ALTER TABLE "DigitalDownloadGrant" ADD CONSTRAINT "DigitalDownloadGrant_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DigitalDownloadGrant" ADD CONSTRAINT "DigitalDownloadGrant_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
