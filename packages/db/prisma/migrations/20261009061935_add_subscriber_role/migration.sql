-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('EMAIL', 'PHONE', 'LICENSE', 'IDENTITY', 'BUSINESS_LICENSE', 'INSURANCE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUBSCRIBER';

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "type" "VerificationType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "documentUrl" TEXT,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "expirationDate" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationRequest_tenantId_listingId_idx" ON "VerificationRequest"("tenantId", "listingId");

-- CreateIndex
CREATE INDEX "VerificationRequest_tenantId_status_idx" ON "VerificationRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "VerificationRequest_tenantId_type_idx" ON "VerificationRequest"("tenantId", "type");

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "GeoCategoryTemplateAssignment_tenantId_geoCategoryTemplateId_id" RENAME TO "GeoCategoryTemplateAssignment_tenantId_geoCategoryTemplateI_idx";

-- RenameIndex
ALTER INDEX "GeoCategoryTemplateAssignment_tenantId_geoCategoryTemplateId_pa" RENAME TO "GeoCategoryTemplateAssignment_tenantId_geoCategoryTemplateI_key";
