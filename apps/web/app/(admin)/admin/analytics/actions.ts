"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/modules/auth";
import { logAudit } from "@/lib/audit";
import { resetAnalyticsConfigCache } from "@/lib/analytics/config";
import {
  getAnalyticsSettings,
  saveAnalyticsSettings,
  syncCompetitorRankings,
  syncGsc,
} from "@/modules/analytics";
import type {
  AnalyticsSecretsInput,
  AnalyticsSettingsData,
  SyncResult,
} from "@/modules/analytics/types";

export type AnalyticsSettingsState = {
  ok: boolean;
  error?: string;
  message?: string;
};

function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function saveAnalyticsSettingsAction(
  _prev: AnalyticsSettingsState,
  formData: FormData,
): Promise<AnalyticsSettingsState> {
  const actor = await requireSection("analytics");
  try {
    const current = await getAnalyticsSettings();
    const retention = Number(formData.get("retentionDays"));
    const text = (key: string) => String(formData.get(key) ?? "").trim();
    const secret = (key: string, clearKey: string) =>
      formData.get(clearKey) === "on" ? null : text(key) || undefined;
    const data: AnalyticsSettingsData = {
      enabled: formData.get("enabled") === "on",
      gscSiteUrl: text("gscSiteUrl"),
      ga4PropertyId: text("ga4PropertyId"),
      competitorDomains: lines(formData.get("competitorDomains")),
      targetKeywords: lines(formData.get("targetKeywords")),
      retentionDays: Number.isFinite(retention) ? Math.min(3650, Math.max(7, Math.round(retention))) : current.retentionDays,
      consentRequired: formData.get("consentRequired") === "on",
      excludedPaths: lines(formData.get("excludedPaths")),
    };
    const secrets: AnalyticsSecretsInput = {
      googleServiceAccountEmail: text("googleServiceAccountEmail") || null,
      googleServiceAccountPrivateKey: secret(
        "googleServiceAccountPrivateKey",
        "clearGoogleServiceAccountPrivateKey",
      ),
      dataForSeoLogin: text("dataForSeoLogin") || null,
      dataForSeoPassword: secret("dataForSeoPassword", "clearDataForSeoPassword"),
    };
    await saveAnalyticsSettings(data, secrets);
    resetAnalyticsConfigCache();
    await logAudit({
      action: "ANALYTICS_SETTINGS_UPDATE",
      entity: "AnalyticsSetting",
      entityId: current.gscSiteUrl || "analytics",
      actorId: actor.id,
      meta: {
        enabled: data.enabled,
        consentRequired: data.consentRequired,
        retentionDays: data.retentionDays,
      },
    });
    revalidatePath("/admin/analytics/settings");
    revalidatePath("/admin/analytics");
    revalidatePath("/", "layout");
    return { ok: true, message: "Analytics settings saved." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save analytics settings." };
  }
}

export async function runGscSyncAction(): Promise<SyncResult> {
  const actor = await requireSection("analytics");
  const result = await syncGsc(7);
  await logAudit({
    action: "ANALYTICS_SYNC",
    entity: "AnalyticsSyncState",
    entityId: "gsc",
    actorId: actor.id,
    meta: { ok: result.ok, skipped: result.skipped ?? false, rows: result.rows ?? 0 },
  });
  revalidatePath("/admin/analytics");
  revalidatePath("/admin/analytics/search");
  revalidatePath("/admin/analytics/settings");
  return result;
}

export async function runCompetitorSyncAction(): Promise<SyncResult> {
  const actor = await requireSection("analytics");
  const result = await syncCompetitorRankings();
  await logAudit({
    action: "ANALYTICS_SYNC",
    entity: "AnalyticsSyncState",
    entityId: "dataforseo",
    actorId: actor.id,
    meta: { ok: result.ok, skipped: result.skipped ?? false, rows: result.rows ?? 0 },
  });
  revalidatePath("/admin/analytics");
  revalidatePath("/admin/analytics/competitors");
  revalidatePath("/admin/analytics/settings");
  return result;
}
