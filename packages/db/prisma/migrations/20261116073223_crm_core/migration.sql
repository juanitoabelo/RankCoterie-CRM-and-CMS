-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scoreUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ToDo" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "dealId" TEXT,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'NORMAL';

-- CreateTable
CREATE TABLE "CrmSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "autoAssignLeads" BOOLEAN NOT NULL DEFAULT false,
    "staleDealDays" INTEGER NOT NULL DEFAULT 14,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmStage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "isWon" BOOLEAN NOT NULL DEFAULT false,
    "isLost" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "probability" INTEGER,
    "expectedCloseDate" TIMESTAMP(3),
    "source" TEXT,
    "ownerId" TEXT,
    "leadId" TEXT,
    "clientId" TEXT,
    "companyName" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "lostReason" TEXT,
    "wonAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "leadId" TEXT,
    "clientId" TEXT,
    "dealId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmSetting_tenantId_key" ON "CrmSetting"("tenantId");

-- CreateIndex
CREATE INDEX "CrmStage_tenantId_order_idx" ON "CrmStage"("tenantId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CrmStage_tenantId_key_key" ON "CrmStage"("tenantId", "key");

-- CreateIndex
CREATE INDEX "Deal_tenantId_stageId_idx" ON "Deal"("tenantId", "stageId");

-- CreateIndex
CREATE INDEX "Deal_tenantId_ownerId_idx" ON "Deal"("tenantId", "ownerId");

-- CreateIndex
CREATE INDEX "Deal_tenantId_expectedCloseDate_idx" ON "Deal"("tenantId", "expectedCloseDate");

-- CreateIndex
CREATE INDEX "Deal_tenantId_lastActivityAt_idx" ON "Deal"("tenantId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "Deal_leadId_idx" ON "Deal"("leadId");

-- CreateIndex
CREATE INDEX "Deal_clientId_idx" ON "Deal"("clientId");

-- CreateIndex
CREATE INDEX "CrmActivity_tenantId_occurredAt_idx" ON "CrmActivity"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "CrmActivity_tenantId_leadId_idx" ON "CrmActivity"("tenantId", "leadId");

-- CreateIndex
CREATE INDEX "CrmActivity_tenantId_clientId_idx" ON "CrmActivity"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "CrmActivity_tenantId_dealId_idx" ON "CrmActivity"("tenantId", "dealId");

-- CreateIndex
CREATE INDEX "CrmActivity_userId_idx" ON "CrmActivity"("userId");

-- CreateIndex
CREATE INDEX "Lead_tenantId_score_idx" ON "Lead"("tenantId", "score");

-- CreateIndex
CREATE INDEX "ToDo_assigneeId_status_idx" ON "ToDo"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "ToDo_clientId_idx" ON "ToDo"("clientId");

-- CreateIndex
CREATE INDEX "ToDo_dealId_idx" ON "ToDo"("dealId");

-- AddForeignKey
ALTER TABLE "ToDo" ADD CONSTRAINT "ToDo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToDo" ADD CONSTRAINT "ToDo_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "CrmStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
