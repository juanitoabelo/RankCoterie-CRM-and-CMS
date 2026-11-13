-- Per-role admin tool visibility overrides (section-level and per-link).
CREATE TABLE "ToolPermissionOverride" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "target" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolPermissionOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ToolPermissionOverride_tenantId_role_target_key"
ON "ToolPermissionOverride"("tenantId", "role", "target");

CREATE INDEX "ToolPermissionOverride_tenantId_idx"
ON "ToolPermissionOverride"("tenantId");
