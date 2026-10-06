-- CreateTable
CREATE TABLE "GeoCategoryTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'single',
    "layout" TEXT NOT NULL DEFAULT 'FULLWIDTH',
    "data" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeoCategoryTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoCategoryTemplateRevision" (
    "id" TEXT NOT NULL,
    "geoCategoryTemplateId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeoCategoryTemplateRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoCategoryTemplateAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "geoCategoryTemplateId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "pageId" TEXT,
    "pageType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeoCategoryTemplateAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeoCategoryTemplate_tenantId_name_type_key" ON "GeoCategoryTemplate"("tenantId", "name", "type");

-- CreateIndex
CREATE INDEX "GeoCategoryTemplate_tenantId_type_idx" ON "GeoCategoryTemplate"("tenantId", "type");

-- CreateIndex
CREATE INDEX "GeoCategoryTemplateRevision_geoCategoryTemplateId_createdAt_idx" ON "GeoCategoryTemplateRevision"("geoCategoryTemplateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GeoCategoryTemplateAssignment_tenantId_geoCategoryTemplateId_pageId_pageType_key" ON "GeoCategoryTemplateAssignment"("tenantId", "geoCategoryTemplateId", "pageId", "pageType");

-- CreateIndex
CREATE INDEX "GeoCategoryTemplateAssignment_tenantId_geoCategoryTemplateId_idx" ON "GeoCategoryTemplateAssignment"("tenantId", "geoCategoryTemplateId");

-- AddForeignKey
ALTER TABLE "GeoCategoryTemplateRevision" ADD CONSTRAINT "GeoCategoryTemplateRevision_geoCategoryTemplateId_fkey" FOREIGN KEY ("geoCategoryTemplateId") REFERENCES "GeoCategoryTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoCategoryTemplateAssignment" ADD CONSTRAINT "GeoCategoryTemplateAssignment_geoCategoryTemplateId_fkey" FOREIGN KEY ("geoCategoryTemplateId") REFERENCES "GeoCategoryTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
