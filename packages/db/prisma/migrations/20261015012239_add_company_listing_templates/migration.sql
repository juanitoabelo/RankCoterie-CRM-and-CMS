-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "companyListingTemplateId" TEXT;

-- CreateTable
CREATE TABLE "CompanyListingTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "layout" TEXT NOT NULL DEFAULT 'sidebar',
    "heroVariant" TEXT NOT NULL DEFAULT 'default',
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "sidebar" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyListingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyListingTemplate_slug_key" ON "CompanyListingTemplate"("slug");

-- CreateIndex
CREATE INDEX "CompanyListingTemplate_isPreset_idx" ON "CompanyListingTemplate"("isPreset");

-- CreateIndex
CREATE INDEX "CompanyListingTemplate_isDefault_idx" ON "CompanyListingTemplate"("isDefault");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_companyListingTemplateId_fkey" FOREIGN KEY ("companyListingTemplateId") REFERENCES "CompanyListingTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
