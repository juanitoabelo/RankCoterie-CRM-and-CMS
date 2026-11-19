-- Email sequences, workflow automation, and public API keys for CRM differentiators.
CREATE TABLE "CrmEmailSequence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmEmailSequence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmEmailSequenceStep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmEmailSequenceStep_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CrmEmailSequenceStep_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "CrmEmailSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CrmEmailSequenceEnrollment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "leadId" TEXT,
    "clientId" TEXT,
    "dealId" TEXT,
    "connectionId" TEXT,
    "toEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "nextSendAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmEmailSequenceEnrollment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CrmEmailSequenceEnrollment_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "CrmEmailSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CrmEmailMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "connectionId" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "CrmEmailMessage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CrmEmailMessage_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CrmEmailSequenceEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "CrmWorkflow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "event" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmWorkflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmWorkflowRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "actions" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmWorkflowRun_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CrmWorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "CrmWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CrmApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmApiKey_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmEmailSequence_tenantId_status_idx" ON "CrmEmailSequence"("tenantId", "status");
CREATE UNIQUE INDEX "CrmEmailSequenceStep_sequenceId_position_key" ON "CrmEmailSequenceStep"("sequenceId", "position");
CREATE INDEX "CrmEmailSequenceStep_tenantId_sequenceId_idx" ON "CrmEmailSequenceStep"("tenantId", "sequenceId");
CREATE UNIQUE INDEX "CrmEmailSequenceEnrollment_tenantId_sequenceId_toEmail_key" ON "CrmEmailSequenceEnrollment"("tenantId", "sequenceId", "toEmail");
CREATE INDEX "CrmEmailSequenceEnrollment_tenantId_status_nextSendAt_idx" ON "CrmEmailSequenceEnrollment"("tenantId", "status", "nextSendAt");
CREATE UNIQUE INDEX "CrmEmailMessage_tenantId_providerMessageId_key" ON "CrmEmailMessage"("tenantId", "providerMessageId");
CREATE INDEX "CrmEmailMessage_tenantId_enrollmentId_idx" ON "CrmEmailMessage"("tenantId", "enrollmentId");
CREATE INDEX "CrmWorkflow_tenantId_event_enabled_idx" ON "CrmWorkflow"("tenantId", "event", "enabled");
CREATE INDEX "CrmWorkflowRun_tenantId_createdAt_idx" ON "CrmWorkflowRun"("tenantId", "createdAt");
CREATE UNIQUE INDEX "CrmApiKey_keyHash_key" ON "CrmApiKey"("keyHash");
CREATE INDEX "CrmApiKey_tenantId_revokedAt_idx" ON "CrmApiKey"("tenantId", "revokedAt");
