CREATE TABLE "CrmPipeline" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmPipeline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmDealTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaults" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmDealTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedDashboard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedDashboard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DashboardWidget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "reportId" TEXT,
    "title" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardWidget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmPipeline_tenantId_key_key" ON "CrmPipeline"("tenantId", "key");
CREATE INDEX "CrmPipeline_tenantId_isDefault_idx" ON "CrmPipeline"("tenantId", "isDefault");

CREATE UNIQUE INDEX "CrmDealTemplate_tenantId_name_key" ON "CrmDealTemplate"("tenantId", "name");
CREATE INDEX "CrmDealTemplate_tenantId_active_idx" ON "CrmDealTemplate"("tenantId", "active");

CREATE INDEX "SavedReport_tenantId_ownerId_idx" ON "SavedReport"("tenantId", "ownerId");
CREATE INDEX "SavedReport_tenantId_shared_idx" ON "SavedReport"("tenantId", "shared");
CREATE INDEX "SavedDashboard_tenantId_ownerId_idx" ON "SavedDashboard"("tenantId", "ownerId");
CREATE INDEX "SavedDashboard_tenantId_shared_idx" ON "SavedDashboard"("tenantId", "shared");
CREATE INDEX "DashboardWidget_tenantId_dashboardId_position_idx" ON "DashboardWidget"("tenantId", "dashboardId", "position");

DROP INDEX IF EXISTS "CrmStage_tenantId_key_key";
ALTER TABLE "CrmStage" ADD COLUMN "pipelineId" TEXT;
CREATE UNIQUE INDEX "CrmStage_tenantId_pipelineId_key_key" ON "CrmStage"("tenantId", "pipelineId", "key");
CREATE INDEX "CrmStage_tenantId_pipelineId_order_idx" ON "CrmStage"("tenantId", "pipelineId", "order");

ALTER TABLE "Deal" ADD COLUMN "pipelineId" TEXT;
ALTER TABLE "Deal" ADD COLUMN "templateId" TEXT;
CREATE INDEX "Deal_tenantId_pipelineId_idx" ON "Deal"("tenantId", "pipelineId");
CREATE INDEX "Deal_tenantId_templateId_idx" ON "Deal"("tenantId", "templateId");

ALTER TABLE "CrmStage" ADD CONSTRAINT "CrmStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CrmPipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CrmPipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CrmDealTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "SavedDashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SavedReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
