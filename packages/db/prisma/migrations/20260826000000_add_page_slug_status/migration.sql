-- AlterTable
ALTER TABLE "Page" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Page" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Page" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE UNIQUE INDEX "Page_tenantId_slug_key" ON "Page"("tenantId", "slug");
