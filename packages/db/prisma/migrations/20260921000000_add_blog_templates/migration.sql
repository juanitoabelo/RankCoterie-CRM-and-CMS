-- CreateTable
CREATE TABLE "BlogTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'listing',
    "data" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogTemplateRevision" (
    "id" TEXT NOT NULL,
    "blogTemplateId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogTemplateRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogTemplateAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "blogTemplateId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "pageId" TEXT,
    "pageType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogTemplateAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogTemplate_tenantId_name_type_key" ON "BlogTemplate"("tenantId", "name", "type");

-- CreateIndex
CREATE INDEX "BlogTemplate_tenantId_type_idx" ON "BlogTemplate"("tenantId", "type");

-- CreateIndex
CREATE INDEX "BlogTemplateRevision_blogTemplateId_createdAt_idx" ON "BlogTemplateRevision"("blogTemplateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlogTemplateAssignment_tenantId_blogTemplateId_pageId_pageType_key" ON "BlogTemplateAssignment"("tenantId", "blogTemplateId", "pageId", "pageType");

-- CreateIndex
CREATE INDEX "BlogTemplateAssignment_tenantId_blogTemplateId_idx" ON "BlogTemplateAssignment"("tenantId", "blogTemplateId");

-- AddForeignKey
ALTER TABLE "BlogTemplateRevision" ADD CONSTRAINT "BlogTemplateRevision_blogTemplateId_fkey" FOREIGN KEY ("blogTemplateId") REFERENCES "BlogTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogTemplateAssignment" ADD CONSTRAINT "BlogTemplateAssignment_blogTemplateId_fkey" FOREIGN KEY ("blogTemplateId") REFERENCES "BlogTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
