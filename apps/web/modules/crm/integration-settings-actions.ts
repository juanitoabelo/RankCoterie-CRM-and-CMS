"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/modules/shared";
import { requireCrmAdmin } from "./access";
import {
  CRM_INTEGRATION_SECRET_KEYS,
  CRM_INTEGRATION_TEXT_KEYS,
  saveCrmIntegrationSettings,
  type CrmIntegrationSettingsInput,
} from "./integration-settings";

const RETURN_PATH = "/admin/crm/settings/integrations";

function optional(formData: FormData, key: string): string | null | undefined {
  if (!formData.has(key)) return undefined;
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function validateUrl(value: string | null | undefined, field: string): void {
  if (!value) return;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${field} must be a valid URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${field} must use http or https.`);
  }
}

export async function crmIntegrationSettingsForm(formData: FormData): Promise<void> {
  const { user } = await requireCrmAdmin();

  const input: CrmIntegrationSettingsInput = {};
  const changed: string[] = [];

  for (const key of CRM_INTEGRATION_TEXT_KEYS) {
    const value = optional(formData, key);
    if (value === undefined) continue;
    input[key] = value;
    changed.push(key);
  }
  for (const key of CRM_INTEGRATION_SECRET_KEYS) {
    const value = optional(formData, key);
    if (value === undefined) continue;
    input[key] = value;
    changed.push(key);
  }

  try {
    validateUrl(input.oauthRedirectBaseUrl, "OAuth redirect base URL");
    validateUrl(input.alertWebhookUrl, "Alert webhook URL");
    await saveCrmIntegrationSettings(input);
    await logAudit({
      action: "CRM_INTEGRATIONS_UPDATE",
      entity: "CrmIntegrationSetting",
      entityId: TENANT_ID,
      actorId: user.id,
      reason: "CRM integration settings updated.",
      meta: { fields: changed },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save integration settings.";
    redirect(`${RETURN_PATH}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(RETURN_PATH);
  revalidatePath("/admin/crm/settings");
  revalidatePath("/api/crm/health");
  redirect(`${RETURN_PATH}?ok=${encodeURIComponent("Integration settings saved.")}`);
}
