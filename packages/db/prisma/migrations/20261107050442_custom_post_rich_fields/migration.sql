-- AlterTable
ALTER TABLE "CustomPost" ADD COLUMN     "canonicalUrl" TEXT,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "featuredImageAssetId" TEXT,
ADD COLUMN     "focusKeyphrase" TEXT,
ADD COLUMN     "jsonSchema" TEXT,
ADD COLUMN     "metaDesc" TEXT,
ADD COLUMN     "metaKeywords" TEXT,
ADD COLUMN     "ogImage" TEXT,
ADD COLUMN     "robotsFollow" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "templateId" TEXT;

-- AddForeignKey
ALTER TABLE "CustomPost" ADD CONSTRAINT "CustomPost_featuredImageAssetId_fkey" FOREIGN KEY ("featuredImageAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomPost" ADD CONSTRAINT "CustomPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
