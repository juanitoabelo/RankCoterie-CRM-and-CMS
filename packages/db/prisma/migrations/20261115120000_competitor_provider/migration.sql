-- AlterTable
ALTER TABLE "AnalyticsSetting"
ADD COLUMN "competitorProvider" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "searxngUrl" TEXT;
