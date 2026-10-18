-- Company Listings (legacy landing pages):
-- 1. spider-ignore flag (legacy "Spider Ignore Content" checkbox)
-- 2. Section / SubTopic membership joins used by the company page editor
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "spiderIgnore" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "ListingSection" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ListingSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ListingSection_listingId_sectionId_key" ON "ListingSection"("listingId", "sectionId");

ALTER TABLE "ListingSection" ADD CONSTRAINT "ListingSection_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingSection" ADD CONSTRAINT "ListingSection_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ListingSubTopic" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ListingSubTopic_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ListingSubTopic_listingId_templateId_key" ON "ListingSubTopic"("listingId", "templateId");

ALTER TABLE "ListingSubTopic" ADD CONSTRAINT "ListingSubTopic_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingSubTopic" ADD CONSTRAINT "ListingSubTopic_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "ContentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
