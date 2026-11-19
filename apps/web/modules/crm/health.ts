import { prisma, TENANT_ID } from "@/modules/shared";
import { isObjectStorageConfigured } from "@/lib/crm-storage";
import { tokenEncryptionConfigured } from "./oauth-crypto";
import { OAUTH_PROVIDERS, oauthProviderConfigured } from "./oauth-providers";
import { getCrmSettings } from "./settings";

export type CrmHealthAlertLevel = "warning" | "error";

export type CrmHealthAlert = {
  id: string;
  level: CrmHealthAlertLevel;
  title: string;
  details: string;
};

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
  alerts: CrmHealthAlert[];
};

const MINUTE_MS = 60_000;
const SYNC_WARN_MINUTES = 45;
const SYNC_ERROR_MINUTES = 120;
const REMINDER_WARN_MINUTES = 120;
const REMINDER_ERROR_MINUTES = 360;
const SYNC_ERROR_WARN_COUNT = 1;
const SYNC_ERROR_ERROR_COUNT = 3;

function minutesSince(timestamp: Date | null, nowMs: number): number | null {
  if (!timestamp) return null;
  return Math.max(0, (nowMs - timestamp.getTime()) / MINUTE_MS);
}

export function evaluateCrmHealthAlerts(
  health: CrmHealth,
  now: Date = new Date(),
): CrmHealthAlert[] {
  const nowMs = now.getTime();
  const alerts: CrmHealthAlert[] = [];

  if (health.counts.mailConnections > 0) {
    const staleMinutes = minutesSince(health.lastSyncAt, nowMs);
    if (staleMinutes === null || staleMinutes >= SYNC_ERROR_MINUTES) {
      alerts.push({
        id: "crm.sync.stale",
        level: "error",
        title: "Mail sync has stopped",
        details:
          staleMinutes === null
            ? `No mailbox sync has ever completed; thresholds are warning at ${SYNC_WARN_MINUTES}m and error at ${SYNC_ERROR_MINUTES}m.`
            : `Last mailbox sync was ${Math.round(staleMinutes)} minute(s) ago; thresholds are warning at ${SYNC_WARN_MINUTES}m and error at ${SYNC_ERROR_MINUTES}m.`,
      });
    } else if (staleMinutes >= SYNC_WARN_MINUTES) {
      alerts.push({
        id: "crm.sync.stale",
        level: "warning",
        title: "Mail sync is stale",
        details: `Last mailbox sync was ${Math.round(staleMinutes)} minute(s) ago; warning at ${SYNC_WARN_MINUTES}m, error at ${SYNC_ERROR_MINUTES}m.`,
      });
    }
  }

  const reminderMinutes = minutesSince(health.lastReminderAt, nowMs);
  if (reminderMinutes === null || reminderMinutes >= REMINDER_ERROR_MINUTES) {
    alerts.push({
      id: "crm.reminders.stale",
      level: "error",
      title: "Reminder run has stopped",
      details:
        reminderMinutes === null
          ? `No reminder run has ever completed; thresholds are warning at ${REMINDER_WARN_MINUTES}m and error at ${REMINDER_ERROR_MINUTES}m.`
          : `Last reminder run was ${Math.round(reminderMinutes)} minute(s) ago; thresholds are warning at ${REMINDER_WARN_MINUTES}m and error at ${REMINDER_ERROR_MINUTES}m.`,
    });
  } else if (reminderMinutes >= REMINDER_WARN_MINUTES) {
    alerts.push({
      id: "crm.reminders.stale",
      level: "warning",
      title: "Reminder run is stale",
      details: `Last reminder run was ${Math.round(reminderMinutes)} minute(s) ago; warning at ${REMINDER_WARN_MINUTES}m, error at ${REMINDER_ERROR_MINUTES}m.`,
    });
  }

  if (health.syncErrors.length >= SYNC_ERROR_WARN_COUNT) {
    const level: CrmHealthAlertLevel =
      health.syncErrors.length >= SYNC_ERROR_ERROR_COUNT ? "error" : "warning";
    alerts.push({
      id: "crm.sync.errors",
      level,
      title: `Mail sync errors on ${health.syncErrors.length} connection(s)`,
      details: health.syncErrors
        .slice(0, 10)
        .map((item) => `${item.provider} (${item.email}): ${item.error}`)
        .join("; "),
    });
  }

  health.warnings.forEach((warning, index) => {
    alerts.push({
      id: `crm.config.${index}`,
      level: "warning",
      title: "CRM configuration warning",
      details: warning,
    });
  });

  if (
    process.env.NODE_ENV === "production" &&
    health.config.attachmentStorage === "database"
  ) {
    alerts.push({
      id: "crm.storage.database",
      level: "error",
      title: "Attachments use database storage in production",
      details:
        "BLOB_READ_WRITE_TOKEN is not configured; new attachments are stored in Postgres. Configure object storage before cutover.",
    });
  }

  return alerts;
}

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

  const checkedAt = new Date();
  const health: CrmHealth = {
    status: warnings.length === 0 ? "ok" : "degraded",
    checkedAt,
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
    alerts: [],
  };

  health.alerts = evaluateCrmHealthAlerts(health, checkedAt);
  return health;
}
