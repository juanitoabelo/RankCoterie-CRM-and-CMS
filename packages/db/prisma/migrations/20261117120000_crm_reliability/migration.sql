-- AlterTable
ALTER TABLE "CrmSetting" ADD COLUMN     "restrictSalesRepsToOwned" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "CrmActivity" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "CrmAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dealId" TEXT,
    "leadId" TEXT,
    "clientId" TEXT,
    "assetId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealLineItem" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmAttachment_tenantId_dealId_idx" ON "CrmAttachment"("tenantId", "dealId");

-- CreateIndex
CREATE INDEX "CrmAttachment_tenantId_leadId_idx" ON "CrmAttachment"("tenantId", "leadId");

-- CreateIndex
CREATE INDEX "CrmAttachment_tenantId_clientId_idx" ON "CrmAttachment"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "CrmProduct_tenantId_active_idx" ON "CrmProduct"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CrmProduct_tenantId_sku_key" ON "CrmProduct"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "DealLineItem_dealId_idx" ON "DealLineItem"("dealId");

-- CreateIndex
CREATE INDEX "DealLineItem_productId_idx" ON "DealLineItem"("productId");

-- CreateIndex
CREATE INDEX "CrmNotification_tenantId_userId_readAt_idx" ON "CrmNotification"("tenantId", "userId", "readAt");

-- CreateIndex
CREATE INDEX "CrmNotification_tenantId_createdAt_idx" ON "CrmNotification"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrmActivity_tenantId_externalId_key" ON "CrmActivity"("tenantId", "externalId");

-- AddForeignKey
ALTER TABLE "CrmAttachment" ADD CONSTRAINT "CrmAttachment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmAttachment" ADD CONSTRAINT "CrmAttachment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmAttachment" ADD CONSTRAINT "CrmAttachment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmAttachment" ADD CONSTRAINT "CrmAttachment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealLineItem" ADD CONSTRAINT "DealLineItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealLineItem" ADD CONSTRAINT "DealLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CrmProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
