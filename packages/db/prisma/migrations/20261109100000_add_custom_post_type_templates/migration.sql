ALTER TABLE "BlogTemplate"
ADD COLUMN "customPostTypeId" TEXT;

CREATE INDEX "BlogTemplate_tenantId_customPostTypeId_idx"
ON "BlogTemplate"("tenantId", "customPostTypeId");
