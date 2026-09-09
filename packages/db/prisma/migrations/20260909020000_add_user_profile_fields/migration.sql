-- AlterTable
ALTER TABLE "User" ADD COLUMN "company" TEXT,
ADD COLUMN "socialMedia" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "undergraduateDegree" TEXT,
ADD COLUMN "undergraduateInstitution" TEXT,
ADD COLUMN "postgraduateDegree" TEXT,
ADD COLUMN "postgraduateInstitution" TEXT,
ADD COLUMN "doctorateDegree" TEXT,
ADD COLUMN "doctorateInstitution" TEXT,
ADD COLUMN "quickBiography" TEXT,
ADD COLUMN "generalSkillsInfo" TEXT,
ADD COLUMN "includeInStaffPages" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "staffPageOrHomePage" TEXT;
