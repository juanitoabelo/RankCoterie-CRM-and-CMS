ALTER TABLE "CrmEmailMessage"
ADD COLUMN "dealId" TEXT,
ADD COLUMN "leadId" TEXT,
ADD COLUMN "clientId" TEXT,
ADD COLUMN "bodyHtml" TEXT,
ADD COLUMN "trackingToken" TEXT,
ADD COLUMN "trackingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "failureCode" TEXT,
ADD COLUMN "failedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "openCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "firstOpenedAt" TIMESTAMP(3),
ADD COLUMN "lastOpenedAt" TIMESTAMP(3),
ADD COLUMN "clickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "firstClickedAt" TIMESTAMP(3),
ADD COLUMN "lastClickedAt" TIMESTAMP(3),
ADD COLUMN "bouncedAt" TIMESTAMP(3),
ADD COLUMN "bounceType" TEXT,
ADD COLUMN "bounceReason" TEXT,
ADD COLUMN "unsubscribedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "CrmEmailMessage_trackingToken_key" ON "CrmEmailMessage"("trackingToken");
CREATE INDEX "CrmEmailMessage_tenantId_dealId_idx" ON "CrmEmailMessage"("tenantId", "dealId");
CREATE INDEX "CrmEmailMessage_tenantId_leadId_idx" ON "CrmEmailMessage"("tenantId", "leadId");
CREATE INDEX "CrmEmailMessage_tenantId_clientId_idx" ON "CrmEmailMessage"("tenantId", "clientId");
CREATE INDEX "CrmEmailMessage_tenantId_status_sentAt_idx" ON "CrmEmailMessage"("tenantId", "status", "sentAt");
CREATE INDEX "CrmEmailMessage_tenantId_toEmail_idx" ON "CrmEmailMessage"("tenantId", "toEmail");

CREATE TABLE "CrmEmailEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT,
    "recipient" TEXT,
    "provider" TEXT,
    "providerEventId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CrmEmailEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmEmailEvent_tenantId_messageId_type_occurredAt_idx" ON "CrmEmailEvent"("tenantId", "messageId", "type", "occurredAt");
CREATE INDEX "CrmEmailEvent_tenantId_enrollmentId_occurredAt_idx" ON "CrmEmailEvent"("tenantId", "enrollmentId", "occurredAt");
CREATE INDEX "CrmEmailEvent_tenantId_type_occurredAt_idx" ON "CrmEmailEvent"("tenantId", "type", "occurredAt");
CREATE INDEX "CrmEmailEvent_tenantId_providerEventId_idx" ON "CrmEmailEvent"("tenantId", "providerEventId");

ALTER TABLE "CrmEmailEvent" ADD CONSTRAINT "CrmEmailEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "CrmEmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CrmEmailSuppression" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT,
    "messageId" TEXT,
    "enrollmentId" TEXT,
    "leadId" TEXT,
    "clientId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmEmailSuppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmEmailSuppression_tenantId_email_key" ON "CrmEmailSuppression"("tenantId", "email");
CREATE INDEX "CrmEmailSuppression_tenantId_active_updatedAt_idx" ON "CrmEmailSuppression"("tenantId", "active", "updatedAt");

CREATE INDEX "Lead_tenantId_createdAt_idx" ON "Lead"("tenantId", "createdAt");
CREATE INDEX "Lead_tenantId_assignedToId_createdAt_idx" ON "Lead"("tenantId", "assignedToId", "createdAt");
CREATE INDEX "Lead_tenantId_lower_email_idx" ON "Lead"("tenantId", lower("email")) WHERE "email" IS NOT NULL;

CREATE INDEX "Client_tenantId_createdAt_idx" ON "Client"("tenantId", "createdAt");
CREATE INDEX "Client_tenantId_assignedToId_createdAt_idx" ON "Client"("tenantId", "assignedToId", "createdAt");
CREATE INDEX "Client_tenantId_lower_email_idx" ON "Client"("tenantId", lower("email")) WHERE "email" IS NOT NULL;

CREATE INDEX "Deal_tenantId_updatedAt_createdAt_idx" ON "Deal"("tenantId", "updatedAt", "createdAt");
CREATE INDEX "Deal_tenantId_stageId_value_createdAt_idx" ON "Deal"("tenantId", "stageId", "value", "createdAt");
CREATE INDEX "Deal_tenantId_createdAt_idx" ON "Deal"("tenantId", "createdAt");

CREATE INDEX "ToDo_leadId_finishedAt_idx" ON "ToDo"("leadId", "finishedAt");
CREATE INDEX "ToDo_finishedAt_dueAt_idx" ON "ToDo"("finishedAt", "dueAt");
CREATE INDEX "ToDo_assigneeId_finishedAt_dueAt_idx" ON "ToDo"("assigneeId", "finishedAt", "dueAt");

CREATE INDEX "CrmEmailConnection_tenantId_active_lastSyncAt_idx" ON "CrmEmailConnection"("tenantId", "active", "lastSyncAt");
CREATE INDEX "CrmEmailConnection_active_errors_idx" ON "CrmEmailConnection"("tenantId") WHERE "active" = true AND "lastSyncError" IS NOT NULL;

CREATE INDEX "CrmNotification_tenantId_userId_title_createdAt_idx" ON "CrmNotification"("tenantId", "userId", "title", "createdAt");

CREATE INDEX "AuditLog_tenantId_action_createdAt_idx" ON "AuditLog"("tenantId", "action", "createdAt");
