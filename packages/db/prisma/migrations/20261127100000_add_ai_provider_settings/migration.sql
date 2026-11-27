CREATE TABLE "AiProviderSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT,
    "model" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiProviderSetting_tenantId_provider_key" ON "AiProviderSetting"("tenantId", "provider");
