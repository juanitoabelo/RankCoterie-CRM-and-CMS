CREATE TABLE "CustomForm" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "fields" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomForm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomFormSubmission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "leadId" TEXT,
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "notificationError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomFormSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomForm_tenantId_name_key" ON "CustomForm"("tenantId", "name");
CREATE INDEX "CustomForm_tenantId_status_idx" ON "CustomForm"("tenantId", "status");
CREATE INDEX "CustomFormSubmission_tenantId_formId_createdAt_idx" ON "CustomFormSubmission"("tenantId", "formId", "createdAt");
CREATE INDEX "CustomFormSubmission_tenantId_status_idx" ON "CustomFormSubmission"("tenantId", "status");
CREATE INDEX "CustomFormSubmission_leadId_idx" ON "CustomFormSubmission"("leadId");

ALTER TABLE "CustomFormSubmission"
ADD CONSTRAINT "CustomFormSubmission_formId_fkey"
FOREIGN KEY ("formId") REFERENCES "CustomForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomFormSubmission"
ADD CONSTRAINT "CustomFormSubmission_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
