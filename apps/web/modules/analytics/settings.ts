import { prisma, TENANT_ID } from "@/modules/shared";
import { DEFAULT_EXCLUDED_PATHS } from "./constants";
import { parseStringArray } from "@/lib/analytics/privacy";
import type {
  AnalyticsSecretStatus,
  AnalyticsSecretsInput,
  AnalyticsSettingsData,
} from "./types";

function mapSettings(row: {
  enabled: boolean;
  gscSiteUrl: string | null;
  ga4PropertyId: string | null;
  competitorDomains: unknown;
  targetKeywords: unknown;
  retentionDays: number;
  consentRequired: boolean;
  excludedPaths: unknown;
}): AnalyticsSettingsData {
  return {
    enabled: row.enabled,
    gscSiteUrl: row.gscSiteUrl ?? "",
    ga4PropertyId: row.ga4PropertyId ?? "",
    competitorDomains: parseStringArray(row.competitorDomains),
    targetKeywords: parseStringArray(row.targetKeywords),
    retentionDays: row.retentionDays,
    consentRequired: row.consentRequired,
    excludedPaths: parseStringArray(row.excludedPaths),
  };
}

export async function getAnalyticsSettings(): Promise<AnalyticsSettingsData> {
  const row = await prisma.analyticsSetting.upsert({
    where: { tenantId: TENANT_ID },
    update: {},
    create: {
      tenantId: TENANT_ID,
      excludedPaths: DEFAULT_EXCLUDED_PATHS,
    },
  });
  return mapSettings(row);
}

export async function getAnalyticsSettingsRecord() {
  return prisma.analyticsSetting.upsert({
    where: { tenantId: TENANT_ID },
    update: {},
    create: {
      tenantId: TENANT_ID,
      excludedPaths: DEFAULT_EXCLUDED_PATHS,
    },
  });
}

function secretValue(input: string | null | undefined, current: string | null): string | null {
  if (input === undefined) return current;
  return input?.trim() || null;
}

export function resolveAnalyticsSecret(
  stored: string | null | undefined,
  envValue: string | undefined,
): string | null {
  const dbValue = typeof stored === "string" ? stored.trim() : "";
  const fallback = typeof envValue === "string" ? envValue.trim() : "";
  return dbValue || fallback || null;
}

export async function getAnalyticsSecretStatus(): Promise<AnalyticsSecretStatus> {
  const row = await getAnalyticsSettingsRecord();
  return {
    googleServiceAccountEmail: row.googleServiceAccountEmail ?? "",
    hasGoogleServiceAccountPrivateKey: Boolean(row.googleServiceAccountPrivateKey),
    dataForSeoLogin: row.dataForSeoLogin ?? "",
    hasDataForSeoPassword: Boolean(row.dataForSeoPassword),
    env: {
      googleServiceAccountEmail: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
      googleServiceAccountPrivateKey: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
      dataForSeoLogin: Boolean(process.env.DATAFORSEO_LOGIN),
      dataForSeoPassword: Boolean(process.env.DATAFORSEO_PASSWORD),
      enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false",
      consentRequired: process.env.NEXT_PUBLIC_ANALYTICS_CONSENT_REQUIRED === "true",
    },
  };
}

export async function saveAnalyticsSettings(
  data: AnalyticsSettingsData,
  secrets: AnalyticsSecretsInput = {},
): Promise<AnalyticsSettingsData> {
  const current = await getAnalyticsSettingsRecord();
  const row = await prisma.analyticsSetting.update({
    where: { tenantId: TENANT_ID },
    data: {
      enabled: data.enabled,
      gscSiteUrl: data.gscSiteUrl || null,
      ga4PropertyId: data.ga4PropertyId || null,
      googleServiceAccountEmail: secretValue(
        secrets.googleServiceAccountEmail,
        current.googleServiceAccountEmail,
      ),
      googleServiceAccountPrivateKey: secretValue(
        secrets.googleServiceAccountPrivateKey,
        current.googleServiceAccountPrivateKey,
      ),
      dataForSeoLogin: secretValue(secrets.dataForSeoLogin, current.dataForSeoLogin),
      dataForSeoPassword: secretValue(secrets.dataForSeoPassword, current.dataForSeoPassword),
      competitorDomains: data.competitorDomains,
      targetKeywords: data.targetKeywords,
      retentionDays: data.retentionDays,
      consentRequired: data.consentRequired,
      excludedPaths: data.excludedPaths,
    },
  });
  return mapSettings(row);
}
