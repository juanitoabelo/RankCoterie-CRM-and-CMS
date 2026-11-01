"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";
import type { CustomCssJsSettings, CustomCssActionResult } from "./types";
import { DEFAULT_CUSTOM_CSS_JS } from "./types";

/** Read the tenant's custom CSS/JS settings. */
export async function getCustomCssJsSettings(): Promise<CustomCssJsSettings> {
  await requireSection("customCssJs");
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const theme = (tenant?.theme ?? {}) as {
    customCssJs?: Partial<CustomCssJsSettings>;
  };
  return { ...DEFAULT_CUSTOM_CSS_JS, ...theme.customCssJs };
}

/** Save custom CSS/JS settings. */
export async function saveCustomCssJsSettings(formData: FormData): Promise<CustomCssActionResult> {
  const actor = await requireSection("customCssJs");
  const str = (k: string) => String(formData.get(k) ?? "").trim();

  const settings: CustomCssJsSettings = {
    customCss: str("customCss"),
    customJs: str("customJs"),
  };

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
    await prisma.tenant.update({
      where: { id: TENANT_ID },
      data: {
        theme: {
          ...(tenant?.theme ?? {}),
          customCssJs: settings,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await logAudit({
      action: "CUSTOM_CSS_JS_UPDATE",
      entity: "Tenant",
      entityId: TENANT_ID,
      actorId: actor.id,
    });
    revalidatePath("/admin/custom-css-js");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save custom CSS/JS settings.",
    };
  }
}