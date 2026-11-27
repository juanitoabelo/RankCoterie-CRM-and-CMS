"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { getAiProviderSettingsView, saveAiProviderSettings } from "@/modules/ai/settings";
import type { AiProviderSettingsInput, AiProviderSettingsView } from "@/modules/ai/settings";

export type AiSettingsActionResult = { ok: true } | { ok: false; error: string };

export async function getAiProviderSettings(): Promise<AiProviderSettingsView> {
  await requireSection("ai");
  return getAiProviderSettingsView();
}

export async function saveAiProviderSettingsAction(
  input: AiProviderSettingsInput,
): Promise<AiSettingsActionResult> {
  const actor = await requireSection("ai");

  try {
    await saveAiProviderSettings(input);
    await logAudit({
      action: "AI_PROVIDER_SETTINGS_UPDATE",
      entity: "Tenant",
      entityId: TENANT_ID,
      actorId: actor.id,
    });
    revalidatePath("/admin/ai-settings");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save AI provider settings.",
    };
  }
}
