-- AlterTable: GeoCategory (Category) SEO fields — parity with the Page content type
-- (SeoFields: SEO / Advanced / Schema tabs). seoTitle/metaDesc support {{region}} tokens.
ALTER TABLE "Category" ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "metaDesc" TEXT,
ADD COLUMN "metaKeywords" TEXT,
ADD COLUMN "focusKeyphrase" TEXT,
ADD COLUMN "ogImage" TEXT,
ADD COLUMN "canonicalUrl" TEXT,
ADD COLUMN "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "robotsFollow" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "jsonSchema" TEXT;
