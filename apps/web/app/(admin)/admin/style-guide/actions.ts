"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { DEFAULT_STYLE_GUIDE, type StyleGuide } from "@/lib/style-guide";
import { requireSection } from "@/lib/admin-auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

const TENANT_ID = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";

/** Read the tenant's global style guide (falls back to defaults). */
export async function getStyleGuide(): Promise<StyleGuide> {
  await requireSection("styleGuide");
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const theme = (tenant?.theme ?? {}) as { styleGuide?: Partial<StyleGuide> };
  return { ...DEFAULT_STYLE_GUIDE, ...theme.styleGuide };
}

export async function saveStyleGuide(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("styleGuide");
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const guide: StyleGuide = {
    background: str("background") || DEFAULT_STYLE_GUIDE.background,
    text: str("text") || DEFAULT_STYLE_GUIDE.text,
    accent: str("accent") || DEFAULT_STYLE_GUIDE.accent,
    headingColor: str("headingColor") || DEFAULT_STYLE_GUIDE.headingColor,
    linkColor: str("linkColor") || DEFAULT_STYLE_GUIDE.linkColor,
    linkHoverColor: str("linkHoverColor") || DEFAULT_STYLE_GUIDE.linkHoverColor,
    buttonBg: str("buttonBg") || DEFAULT_STYLE_GUIDE.buttonBg,
    buttonText: str("buttonText") || DEFAULT_STYLE_GUIDE.buttonText,
    fonts: {
      heading: str("fontsHeading") || DEFAULT_STYLE_GUIDE.fonts.heading,
      body: str("fontsBody") || DEFAULT_STYLE_GUIDE.fonts.body,
    },
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
          styleGuide: guide,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await logAudit({ action: "STYLE_GUIDE_UPDATE", entity: "Tenant", entityId: TENANT_ID, actorId: actor.id });
    revalidatePath("/admin/style-guide");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save the style guide.",
    };
  }
}

export async function saveStyleGuideForm(formData: FormData): Promise<void> {
  await saveStyleGuide(formData);
}
