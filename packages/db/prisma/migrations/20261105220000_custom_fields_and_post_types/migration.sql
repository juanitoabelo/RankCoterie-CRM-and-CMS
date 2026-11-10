CREATE TABLE "CustomFieldGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contentTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "fields" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomFieldGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "values" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomPostType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coreFields" TEXT[] NOT NULL DEFAULT ARRAY['title', 'slug', 'body', 'status']::TEXT[],
    "fieldGroupIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomPostType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomPost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "postTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "values" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomFieldGroup_tenantId_name_key" ON "CustomFieldGroup"("tenantId", "name");
CREATE INDEX "CustomFieldGroup_tenantId_updatedAt_idx" ON "CustomFieldGroup"("tenantId", "updatedAt");
CREATE UNIQUE INDEX "CustomFieldValue_tenantId_contentType_recordId_key" ON "CustomFieldValue"("tenantId", "contentType", "recordId");
CREATE INDEX "CustomFieldValue_tenantId_contentType_idx" ON "CustomFieldValue"("tenantId", "contentType");
CREATE UNIQUE INDEX "CustomPostType_tenantId_slug_key" ON "CustomPostType"("tenantId", "slug");
CREATE INDEX "CustomPostType_tenantId_updatedAt_idx" ON "CustomPostType"("tenantId", "updatedAt");
CREATE UNIQUE INDEX "CustomPost_postTypeId_slug_key" ON "CustomPost"("postTypeId", "slug");
CREATE INDEX "CustomPost_tenantId_postTypeId_updatedAt_idx" ON "CustomPost"("tenantId", "postTypeId", "updatedAt");
ALTER TABLE "CustomPost" ADD CONSTRAINT "CustomPost_postTypeId_fkey" FOREIGN KEY ("postTypeId") REFERENCES "CustomPostType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
