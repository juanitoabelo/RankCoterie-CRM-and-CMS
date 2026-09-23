-- CreateIndex: AuditLog.createdAt for time-range queries
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex: FeedItem.feedId + feedDate for feed sync queries
CREATE INDEX "FeedItem_feedId_feedDate_idx" ON "FeedItem"("feedId", "feedDate");

-- CreateIndex: Region.tenantId for tenant-scoped queries
CREATE INDEX "Region_tenantId_idx" ON "Region"("tenantId");

-- CreateIndex: Lead.tenantId + status for CRM queries
CREATE INDEX "Lead_tenantId_status_idx" ON "Lead"("tenantId", "status");

-- CreateIndex: Client.tenantId for tenant-scoped queries
CREATE INDEX "Client_tenantId_idx" ON "Client"("tenantId");

-- CreateIndex: Invoice.clientId for client invoice lookups
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");
