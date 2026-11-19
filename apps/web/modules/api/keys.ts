import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma, TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { logAudit } from "@/lib/audit";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { apiKeyPrefix, hashApiKey } from "./auth-helpers";

export const CRM_API_SCOPES = ["crm:read", "crm:write"] as const;

export type CrmApiKeyResult =
  | { ok: true; id: string; token: string }
  | { ok: false; error: string }
  | { ok: true; message: string };

async function requireCrmAdmin() {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  if (!access.isAdmin) throw new Error("Only CRM admins can manage API keys.");
  return user;
}

export async function getCrmApiKeys() {
  await requireCrmAdmin();
  return prisma.crmApiKey.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCrmApiKey(name: string, scopes: string[]): Promise<CrmApiKeyResult> {
  const user = await requireCrmAdmin();
  const cleanName = name.trim();
  if (!cleanName) return { ok: false, error: "Key name is required." };
  const cleanScopes = scopes.filter((scope): scope is (typeof CRM_API_SCOPES)[number] =>
    (CRM_API_SCOPES as readonly string[]).includes(scope),
  );
  if (cleanScopes.length === 0) return { ok: false, error: "Select at least one scope." };

  const token = `rc_live_${randomBytes(24).toString("base64url")}`;
  const key = await prisma.crmApiKey.create({
    data: {
      tenantId: TENANT_ID,
      name: cleanName,
      keyPrefix: apiKeyPrefix(token),
      keyHash: hashApiKey(token),
      scopes: cleanScopes,
      createdById: user.id,
    },
  });
  await logAudit({
    action: "CRM_API_KEY_CREATE",
    entity: "CrmApiKey",
    entityId: key.id,
    actorId: user.id,
    reason: `API key "${cleanName}" created`,
    meta: { scopes: cleanScopes },
  });
  revalidatePath("/admin/crm/api-keys");
  return { ok: true, id: key.id, token };
}

export async function revokeCrmApiKey(id: string): Promise<CrmApiKeyResult> {
  const user = await requireCrmAdmin();
  const result = await prisma.crmApiKey.updateMany({
    where: { id, tenantId: TENANT_ID, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) return { ok: false, error: "API key not found or already revoked." };
  await logAudit({
    action: "CRM_API_KEY_REVOKE",
    entity: "CrmApiKey",
    entityId: id,
    actorId: user.id,
    reason: "API key revoked",
  });
  revalidatePath("/admin/crm/api-keys");
  return { ok: true, message: "API key revoked." };
}
