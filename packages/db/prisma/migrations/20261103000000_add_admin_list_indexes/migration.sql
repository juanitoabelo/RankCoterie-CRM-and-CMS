-- CreateIndex
CREATE INDEX "Region_tenantId_state_city_idx" ON "Region"("tenantId", "state", "city");

-- CreateIndex
CREATE INDEX "Category_tenantId_title_idx" ON "Category"("tenantId", "title");

-- CreateIndex
CREATE INDEX "Category_tenantId_status_idx" ON "Category"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ContentTemplate_tenantId_status_updatedAt_idx" ON "ContentTemplate"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ContentTemplate_tenantId_title_idx" ON "ContentTemplate"("tenantId", "title");

-- CreateIndex
CREATE INDEX "Page_tenantId_status_name_idx" ON "Page"("tenantId", "status", "name");

-- CreateIndex
CREATE INDEX "Section_tenantId_title_idx" ON "Section"("tenantId", "title");
