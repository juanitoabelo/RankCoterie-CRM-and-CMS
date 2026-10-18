-- AlterTable
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "listingTemplateId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ListingTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "layout" TEXT NOT NULL DEFAULT 'sidebar',
    "heroVariant" TEXT NOT NULL DEFAULT 'default',
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "sidebar" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ListingTemplate_slug_key" ON "ListingTemplate"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ListingTemplate_isPreset_idx" ON "ListingTemplate"("isPreset");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Listing" ADD CONSTRAINT "Listing_listingTemplateId_fkey"
    FOREIGN KEY ("listingTemplateId") REFERENCES "ListingTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
