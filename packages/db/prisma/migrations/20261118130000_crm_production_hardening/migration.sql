-- Allow attachments to live in object storage instead of Postgres.
ALTER TABLE "CrmAttachment" ALTER COLUMN "assetId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CrmAttachment" ADD COLUMN     "storageProvider" TEXT,
ADD COLUMN     "storageKey" TEXT;

-- CreateTable
CREATE TABLE "CrmEmailConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "syncCursor" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmEmailConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmEmailConnection_tenantId_userId_provider_key" ON "CrmEmailConnection"("tenantId", "userId", "provider");

-- CreateIndex
CREATE INDEX "CrmEmailConnection_tenantId_active_idx" ON "CrmEmailConnection"("tenantId", "active");

-- CreateIndex
CREATE INDEX "CrmEmailConnection_tenantId_lastSyncAt_idx" ON "CrmEmailConnection"("tenantId", "lastSyncAt");
