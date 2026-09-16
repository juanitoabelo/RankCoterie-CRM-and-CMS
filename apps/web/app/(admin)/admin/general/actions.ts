"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";
import type { GeneralSettings, GeneralActionResult } from "./types";
import { DEFAULT_GENERAL_SETTINGS } from "./types";

/** Read the tenant's general settings. */
export async function getGeneralSettings(): Promise<GeneralSettings> {
  await requireSection("general");
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const theme = (tenant?.theme ?? {}) as { generalSettings?: Partial<GeneralSettings> };
  return { ...DEFAULT_GENERAL_SETTINGS, ...theme.generalSettings };
}

/** Save general settings. */
export async function saveGeneralSettings(formData: FormData): Promise<GeneralActionResult> {
  const actor = await requireSection("general");
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const bool = (k: string) => formData.get(k) === "on" || formData.get(k) === "true";

  const settings: GeneralSettings = {
    siteTitle: str("siteTitle"),
    tagline: str("tagline"),
    siteIconUrl: str("siteIconUrl"),
    siteUrl: str("siteUrl"),
    adminEmail: str("adminEmail"),
    membership: bool("membership"),
    defaultRole: str("defaultRole") || "EDITOR",
    language: str("language") || "en",
    timezone: str("timezone") || "UTC+0",
    dateFormat: str("dateFormat") || "F j, Y",
    customDateFormat: str("customDateFormat"),
    timeFormat: str("timeFormat") || "g:i a",
    customTimeFormat: str("customTimeFormat"),
    weekStartsOn: str("weekStartsOn") || "Monday",
  };

  try {
    const tenant = await prisma.tenant.upsert({
      where: { id: TENANT_ID },
      update: {},
      create: { id: TENANT_ID, name: "Canopy", domainKey: "canopy.local" },
    });
    const theme = (tenant.theme ?? {}) as Record<string, unknown>;
    await prisma.tenant.update({
      where: { id: TENANT_ID },
      data: {
        theme: {
          ...theme,
          generalSettings: settings,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await logAudit({
      action: "GENERAL_SETTINGS_UPDATE",
      entity: "Tenant",
      entityId: TENANT_ID,
      actorId: actor.id,
    });
    revalidatePath("/admin/general");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save general settings.",
    };
  }
}
