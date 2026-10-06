-- AlterTable: CategoryRegionContent — per-(category, region) FAQ blocks for /g/* content depth (Phase 2).
ALTER TABLE "CategoryRegionContent" ADD COLUMN "faq" JSONB NOT NULL DEFAULT '[]';
