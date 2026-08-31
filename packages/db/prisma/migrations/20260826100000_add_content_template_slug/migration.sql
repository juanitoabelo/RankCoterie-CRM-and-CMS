-- AlterTable
ALTER TABLE "ContentTemplate" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "ContentTemplate_tenantId_slug_key" ON "ContentTemplate"("tenantId", "slug");
