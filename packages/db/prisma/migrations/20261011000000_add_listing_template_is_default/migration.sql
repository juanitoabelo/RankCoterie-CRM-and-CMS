-- AlterTable
ALTER TABLE "ListingTemplate" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ListingTemplate_isDefault_idx" ON "ListingTemplate"("isDefault");
