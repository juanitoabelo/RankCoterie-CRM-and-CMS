-- CreateTable
CREATE TABLE "CustomFont" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "weight" TEXT NOT NULL DEFAULT '400',
    "style" TEXT NOT NULL DEFAULT 'normal',
    "mono" BOOLEAN NOT NULL DEFAULT false,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "filename" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFont_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomFont_tenantId_family_weight_style_key" ON "CustomFont"("tenantId", "family", "weight", "style");

-- CreateIndex
CREATE INDEX "CustomFont_tenantId_idx" ON "CustomFont"("tenantId");
