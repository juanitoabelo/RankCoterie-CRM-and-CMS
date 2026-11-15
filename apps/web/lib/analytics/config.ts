import { prisma, TENANT_ID } from "@/modules/shared";
import { DEFAULT_EXCLUDED_PATHS } from "@/modules/analytics/constants";
import { parseStringArray } from "@/lib/analytics/privacy";

export type AnalyticsConfig = {
  consentRequired: boolean;
  excludedPaths: string[];
  enabled: boolean;
};

const TTL_MS = 60_000;
let cached: { value: AnalyticsConfig; expiresAt: number } | null = null;

export async function getAnalyticsConfig(): Promise<AnalyticsConfig> {
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  let value: AnalyticsConfig = {
    consentRequired: process.env.NEXT_PUBLIC_ANALYTICS_CONSENT_REQUIRED === "true",
    excludedPaths: DEFAULT_EXCLUDED_PATHS,
    enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false",
  };

  try {
    const row = await prisma.analyticsSetting.findUnique({
      where: { tenantId: TENANT_ID },
      select: { enabled: true, consentRequired: true, excludedPaths: true },
    });
    if (row) {
      value = {
        consentRequired: row.consentRequired,
        excludedPaths: parseStringArray(row.excludedPaths),
        enabled: row.enabled,
      };
    }
  } catch {
    // Keep safe defaults if the analytics table is unavailable.
  }

  cached = { value, expiresAt: Date.now() + TTL_MS };
  return value;
}

export function resetAnalyticsConfigCache(): void {
  cached = null;
}
