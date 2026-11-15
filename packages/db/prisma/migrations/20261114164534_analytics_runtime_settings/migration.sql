-- AlterTable
ALTER TABLE "AnalyticsSetting"
ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "googleServiceAccountEmail" TEXT,
ADD COLUMN "googleServiceAccountPrivateKey" TEXT,
ADD COLUMN "dataForSeoLogin" TEXT,
ADD COLUMN "dataForSeoPassword" TEXT;
