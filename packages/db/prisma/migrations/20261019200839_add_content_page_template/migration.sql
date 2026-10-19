-- CreateTable
CREATE TABLE "ContentPageTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "layout" TEXT NOT NULL DEFAULT 'FULLWIDTH',
    "data" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPageTemplateRevision" (
    "id" TEXT NOT NULL,
    "contentPageTemplateId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPageTemplateRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPageTemplateAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contentPageTemplateId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "pageId" TEXT,
    "pageType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPageTemplateAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentPageTemplate_tenantId_kind_idx" ON "ContentPageTemplate"("tenantId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPageTemplate_tenantId_name_kind_key" ON "ContentPageTemplate"("tenantId", "name", "kind");

-- CreateIndex
CREATE INDEX "ContentPageTemplateRevision_contentPageTemplateId_createdAt_idx" ON "ContentPageTemplateRevision"("contentPageTemplateId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentPageTemplateAssignment_tenantId_contentPageTemplateI_idx" ON "ContentPageTemplateAssignment"("tenantId", "contentPageTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPageTemplateAssignment_tenantId_contentPageTemplateI_key" ON "ContentPageTemplateAssignment"("tenantId", "contentPageTemplateId", "pageId", "pageType");

-- AddForeignKey
ALTER TABLE "ContentPageTemplateRevision" ADD CONSTRAINT "ContentPageTemplateRevision_contentPageTemplateId_fkey" FOREIGN KEY ("contentPageTemplateId") REFERENCES "ContentPageTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPageTemplateAssignment" ADD CONSTRAINT "ContentPageTemplateAssignment_contentPageTemplateId_fkey" FOREIGN KEY ("contentPageTemplateId") REFERENCES "ContentPageTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
