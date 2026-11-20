import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { decryptToken, encryptToken } from "./oauth-crypto";

export const CRM_INTEGRATION_TEXT_KEYS = [
  "googleClientId",
  "microsoftClientId",
  "microsoftTenantId",
  "oauthRedirectBaseUrl",
] as const;

export const CRM_INTEGRATION_SECRET_KEYS = [
  "googleClientSecret",
  "microsoftClientSecret",
  "blobToken",
  "alertWebhookUrl",
  "emailEventsSecret",
] as const;

export type CrmIntegrationTextKey = (typeof CRM_INTEGRATION_TEXT_KEYS)[number];
export type CrmIntegrationSecretKey = (typeof CRM_INTEGRATION_SECRET_KEYS)[number];

export type CrmIntegrationValueSource = "saved" | "environment" | null;

export type CrmIntegrationView = {
  [K in CrmIntegrationTextKey]: { value: string | null; source: CrmIntegrationValueSource };
} & {
  [K in CrmIntegrationSecretKey]: { configured: boolean; source: CrmIntegrationValueSource };
};

export type CrmIntegrationSettingsInput = {
  [K in CrmIntegrationTextKey | CrmIntegrationSecretKey]?: string | null;
};

type TextDbField =
  | "googleClientId"
  | "microsoftClientId"
  | "microsoftTenantId"
  | "oauthRedirectBaseUrl";

type SecretDbField =
  | "googleClientSecretEncrypted"
  | "microsoftClientSecretEncrypted"
  | "blobTokenEncrypted"
  | "alertWebhookUrlEncrypted"
  | "emailEventsSecretEncrypted";

const TEXT_DB_FIELDS: Record<CrmIntegrationTextKey, TextDbField> = {
  googleClientId: "googleClientId",
  microsoftClientId: "microsoftClientId",
  microsoftTenantId: "microsoftTenantId",
  oauthRedirectBaseUrl: "oauthRedirectBaseUrl",
};

const SECRET_DB_FIELDS: Record<CrmIntegrationSecretKey, SecretDbField> = {
  googleClientSecret: "googleClientSecretEncrypted",
  microsoftClientSecret: "microsoftClientSecretEncrypted",
  blobToken: "blobTokenEncrypted",
  alertWebhookUrl: "alertWebhookUrlEncrypted",
  emailEventsSecret: "emailEventsSecretEncrypted",
};

const TEXT_ENV_NAMES: Record<CrmIntegrationTextKey, string[]> = {
  googleClientId: ["GOOGLE_CLIENT_ID"],
  microsoftClientId: ["MICROSOFT_CLIENT_ID"],
  microsoftTenantId: ["MICROSOFT_TENANT_ID"],
  oauthRedirectBaseUrl: ["CRM_OAUTH_REDIRECT_BASE_URL"],
};

const SECRET_ENV_NAMES: Record<CrmIntegrationSecretKey, string[]> = {
  googleClientSecret: ["GOOGLE_CLIENT_SECRET"],
  microsoftClientSecret: ["MICROSOFT_CLIENT_SECRET"],
  blobToken: ["BLOB_READ_WRITE_TOKEN"],
  alertWebhookUrl: ["CRM_ALERT_WEBHOOK_URL"],
  emailEventsSecret: ["CRM_EMAIL_EVENTS_SECRET", "CRON_SECRET"],
};

export const CRM_INTEGRATION_MANAGED_ENV_FIELDS = [
  { label: "Database URL", names: ["DATABASE_URL", "DIRECT_URL"] },
  { label: "Session / token encryption", names: ["SESSION_SECRET", "CRM_TOKEN_ENCRYPTION_KEY"] },
  {
    label: "Cron / webhook auth",
    names: [
      "CRON_SECRET",
      "CRM_SYNC_SECRET",
      "CRM_REMINDER_SECRET",
      "CRM_HEALTH_SECRET",
      "CRM_SEQUENCE_SECRET",
      "CRM_WEBHOOK_SECRET",
      "CRM_EMAIL_EVENTS_SECRET",
    ],
  },
  { label: "Public site URL", names: ["SITE_URL", "NEXT_PUBLIC_SITE_URL"] },
  { label: "Payments", names: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] },
] as const;

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function envValue(names: readonly string[]): string | null {
  for (const name of names) {
    const value = clean(process.env[name]);
    if (value) return value;
  }
  return null;
}

type IntegrationRecord = Awaited<ReturnType<typeof prisma.crmIntegrationSetting.findUnique>>;

async function loadRecord(): Promise<IntegrationRecord> {
  try {
    return await prisma.crmIntegrationSetting.findUnique({ where: { tenantId: TENANT_ID } });
  } catch {
    return null;
  }
}

function decrypted(record: IntegrationRecord, key: CrmIntegrationSecretKey): string | null {
  const encrypted = record?.[SECRET_DB_FIELDS[key]];
  if (typeof encrypted !== "string" || !encrypted) return null;
  try {
    return clean(decryptToken(encrypted));
  } catch {
    return null;
  }
}

export async function resolveCrmIntegrationText(key: CrmIntegrationTextKey): Promise<string | null> {
  const record = await loadRecord();
  const field = TEXT_DB_FIELDS[key] as keyof NonNullable<IntegrationRecord>;
  return clean(record?.[field] as string | null) ?? envValue(TEXT_ENV_NAMES[key]);
}

export async function resolveCrmIntegrationSecret(
  key: CrmIntegrationSecretKey,
): Promise<string | null> {
  const record = await loadRecord();
  return decrypted(record, key) ?? envValue(SECRET_ENV_NAMES[key]);
}

export async function getCrmIntegrationSettingsView(): Promise<CrmIntegrationView> {
  const record = await loadRecord();
  const view = {} as CrmIntegrationView;

  for (const key of CRM_INTEGRATION_TEXT_KEYS) {
    const field = TEXT_DB_FIELDS[key] as keyof NonNullable<IntegrationRecord>;
    const saved = clean(record?.[field] as string | null);
    const environment = envValue(TEXT_ENV_NAMES[key]);
    (view[key] as { value: string | null; source: CrmIntegrationValueSource }) = {
      value: saved ?? environment,
      source: saved ? "saved" : environment ? "environment" : null,
    };
  }

  for (const key of CRM_INTEGRATION_SECRET_KEYS) {
    const field = SECRET_DB_FIELDS[key] as keyof NonNullable<IntegrationRecord>;
    const saved = Boolean(clean(record?.[field] as string | null));
    const environment = Boolean(envValue(SECRET_ENV_NAMES[key]));
    (view[key] as { configured: boolean; source: CrmIntegrationValueSource }) = {
      configured: saved || environment,
      source: saved ? "saved" : environment ? "environment" : null,
    };
  }

  return view;
}

export async function saveCrmIntegrationSettings(
  input: CrmIntegrationSettingsInput,
): Promise<void> {
  const createData: Prisma.CrmIntegrationSettingUncheckedCreateInput = { tenantId: TENANT_ID };
  const updateData: Prisma.CrmIntegrationSettingUncheckedUpdateInput = {};

  for (const key of CRM_INTEGRATION_TEXT_KEYS) {
    if (!(key in input)) continue;
    const field = TEXT_DB_FIELDS[key];
    const value = clean(input[key]);
    createData[field] = value;
    updateData[field] = value;
  }

  for (const key of CRM_INTEGRATION_SECRET_KEYS) {
    if (!(key in input)) continue;
    const field = SECRET_DB_FIELDS[key];
    const value = clean(input[key]);
    const stored = value ? encryptToken(value) : null;
    createData[field] = stored;
    updateData[field] = stored;
  }

  await prisma.crmIntegrationSetting.upsert({
    where: { tenantId: TENANT_ID },
    create: createData,
    update: updateData,
  });
}
