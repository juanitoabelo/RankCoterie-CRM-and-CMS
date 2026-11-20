CREATE TABLE "CrmIntegrationSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "googleClientId" TEXT,
    "googleClientSecretEncrypted" TEXT,
    "microsoftClientId" TEXT,
    "microsoftClientSecretEncrypted" TEXT,
    "microsoftTenantId" TEXT,
    "oauthRedirectBaseUrl" TEXT,
    "blobTokenEncrypted" TEXT,
    "alertWebhookUrlEncrypted" TEXT,
    "emailEventsSecretEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmIntegrationSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmIntegrationSetting_tenantId_key" ON "CrmIntegrationSetting"("tenantId");
