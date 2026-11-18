import { prisma, TENANT_ID } from "@/modules/shared";
import { isObjectStorageConfigured } from "@/lib/crm-storage";
import { tokenEncryptionConfigured } from "./oauth-crypto";
import { OAUTH_PROVIDERS, oauthProviderConfigured } from "./oauth-providers";
import { getCrmSettings } from "./settings";

export type CrmHealth = {
  status: "ok" | "degraded";
  checkedAt: Date;
  counts: {
    leads: number;
    clients: number;
    deals: number;
    openTasks: number;
    unreadNotifications: number;
    attachments: number;
    mailConnections: number;
  };
  config: {
    attachmentStorage: "vercel-blob" | "database";
    tokenEncryption: boolean;
    reminderAuth: boolean;
    syncAuth: boolean;
    cronSecret: boolean;
    googleOAuth: boolean;
    microsoftOAuth: boolean;
    ownedRecordsOnly: boolean;
  };
  lastSyncAt: Date | null;
  lastReminderAt: Date | null;
  lastAuditAt: Date | null;
  syncErrors: Array<{ provider: string; email: string; error: string }>;
  warnings: string[];
};

export async function getCrmHealth(): Promise<CrmHealth> {
  const [
    settings,
    leads,
    clients,
    deals,
    openTasks,
    unreadNotifications,
    attachments,
    mailConnections,
    lastSync,
    lastReminder,
    lastAudit,
    failingConnections,
  ] = await Promise.all([
    getCrmSettings(),
    prisma.lead.count({ where: { tenantId: TENANT_ID } }),
    prisma.client.count({ where: { tenantId: TENANT_ID } }),
    prisma.deal.count({ where: { tenantId: TENANT_ID } }),
    prisma.toDo.count({
      where: {
        finishedAt: null,
        OR: [
          { lead: { tenantId: TENANT_ID } },
          { client: { tenantId: TENANT_ID } },
          { deal: { tenantId: TENANT_ID } },
        ],
      },
    }),
    prisma.crmNotification.count({
      where: { tenantId: TENANT_ID, readAt: null },
    }),
    prisma.crmAttachment.count({ where: { tenantId: TENANT_ID } }),
    prisma.crmEmailConnection.count({ where: { tenantId: TENANT_ID, active: true } }),
    prisma.crmEmailConnection.findFirst({
      where: { tenantId: TENANT_ID, active: true },
      orderBy: { lastSyncAt: "desc" },
      select: { lastSyncAt: true },
    }),
    prisma.auditLog.findFirst({
      where: { tenantId: TENANT_ID, action: "CRM_REMINDER_SEND" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.auditLog.findFirst({
      where: { tenantId: TENANT_ID, action: { startsWith: "CRM_" } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.crmEmailConnection.findMany({
      where: { tenantId: TENANT_ID, active: true, lastSyncError: { not: null } },
      select: { provider: true, email: true, lastSyncError: true },
      take: 10,
    }),
  ]);

  const warnings: string[] = [];
  if (!isObjectStorageConfigured()) {
    warnings.push("BLOB_READ_WRITE_TOKEN is not set; new attachments are stored in Postgres.");
  }
  if (!tokenEncryptionConfigured()) {
    warnings.push("CRM_TOKEN_ENCRYPTION_KEY and SESSION_SECRET are both missing.");
  }
  if (!process.env.CRON_SECRET && !process.env.CRM_REMINDER_SECRET) {
    warnings.push("Cron authentication is not configured (CRON_SECRET or CRM_REMINDER_SECRET).");
  }
  if (!process.env.CRON_SECRET && !process.env.CRM_SYNC_SECRET) {
    warnings.push("Mail sync authentication is not configured (CRON_SECRET or CRM_SYNC_SECRET).");
  }
  if (!process.env.CRM_ALERT_WEBHOOK_URL) {
    warnings.push("CRM_ALERT_WEBHOOK_URL is not set; failures only appear in logs.");
  }
  for (const provider of OAUTH_PROVIDERS) {
    if (!oauthProviderConfigured(provider)) warnings.push(`${provider} OAuth is not configured.`);
  }

  return {
    status: warnings.length === 0 ? "ok" : "degraded",
    checkedAt: new Date(),
    counts: {
      leads,
      clients,
      deals,
      openTasks,
      unreadNotifications,
      attachments,
      mailConnections,
    },
    config: {
      attachmentStorage: isObjectStorageConfigured() ? "vercel-blob" : "database",
      tokenEncryption: tokenEncryptionConfigured(),
      reminderAuth: Boolean(process.env.CRM_REMINDER_SECRET || process.env.CRON_SECRET),
      syncAuth: Boolean(process.env.CRM_SYNC_SECRET || process.env.CRON_SECRET),
      cronSecret: Boolean(process.env.CRON_SECRET),
      googleOAuth: oauthProviderConfigured("google"),
      microsoftOAuth: oauthProviderConfigured("microsoft"),
      ownedRecordsOnly: settings.restrictSalesRepsToOwned,
    },
    lastSyncAt: lastSync?.lastSyncAt ?? null,
    lastReminderAt: lastReminder?.createdAt ?? null,
    lastAuditAt: lastAudit?.createdAt ?? null,
    syncErrors: failingConnections.map((connection) => ({
      provider: connection.provider,
      email: connection.email,
      error: connection.lastSyncError ?? "Unknown error",
    })),
    warnings,
  };
}
