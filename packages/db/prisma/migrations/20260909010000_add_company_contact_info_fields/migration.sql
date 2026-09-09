-- AlterTable
ALTER TABLE "Company" ADD COLUMN "tagline" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "businessHours" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "industryCategory" TEXT,
ADD COLUMN "industrySubCategory" TEXT,
ADD COLUMN "industrySubSubCategory" TEXT,
ADD COLUMN "audiencePersona1" TEXT,
ADD COLUMN "audiencePersona2" TEXT,
ADD COLUMN "audiencePersona3" TEXT,
ADD COLUMN "languagesSpoken" TEXT,
ADD COLUMN "additionalLanguage" TEXT,
ADD COLUMN "contactInfo" JSONB NOT NULL DEFAULT '{}';
