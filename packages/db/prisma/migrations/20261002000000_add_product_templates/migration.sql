-- Product Template tables (schema existed but was never migrated; DBs using `db push` already have these)
-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'single',
    "data" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductTemplateRevision" (
    "id" TEXT NOT NULL,
    "productTemplateId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductTemplateRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductTemplateAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productTemplateId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "pageId" TEXT,
    "pageType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductTemplateAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductTemplate_tenantId_type_idx" ON "ProductTemplate"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProductTemplate_tenantId_name_type_key" ON "ProductTemplate"("tenantId", "name", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductTemplateRevision_productTemplateId_createdAt_idx" ON "ProductTemplateRevision"("productTemplateId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductTemplateAssignment_tenantId_productTemplateId_idx" ON "ProductTemplateAssignment"("tenantId", "productTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProductTemplateAssignment_tenantId_productTemplateId_pageId_key" ON "ProductTemplateAssignment"("tenantId", "productTemplateId", "pageId", "pageType");

-- AddForeignKey (guarded: DBs already pushed have these constraints)
DO $$ BEGIN
    ALTER TABLE "ProductTemplateRevision" ADD CONSTRAINT "ProductTemplateRevision_productTemplateId_fkey" FOREIGN KEY ("productTemplateId") REFERENCES "ProductTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProductTemplateAssignment" ADD CONSTRAINT "ProductTemplateAssignment_productTemplateId_fkey" FOREIGN KEY ("productTemplateId") REFERENCES "ProductTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
