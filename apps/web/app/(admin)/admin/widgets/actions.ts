"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { sanitizeHtml } from "@/lib/style-guide";
import { TENANT_ID } from "@/modules/shared";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function listWidgets() {
  await requireSection("widgets");
  return prisma.widget.findMany({
    where: { tenantId: TENANT_ID },
    include: { placements: true, imageAsset: { select: { id: true } } },
    orderBy: { name: "asc" },
  });
}

export async function getWidget(id: string) {
  await requireSection("widgets");
  return prisma.widget.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: {
      placements: { orderBy: { order: "asc" } },
      imageAsset: { select: { id: true } },
      company: { select: { id: true, name: true } },
    },
  });
}

export async function getCompanyOptions() {
  await requireSection("widgets");
  return prisma.company.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function createWidget(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("widgets");
  const title = String(formData.get("title") ?? "").trim();
  const name = title || String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim() || null;
  const html = sanitizeHtml(String(formData.get("html") ?? ""));
  const keywords = String(formData.get("keywords") ?? "").trim() || null;
  const companyId = String(formData.get("companyId") ?? "").trim() || null;
  const imageAssetId = String(formData.get("imageAssetId") ?? "").trim() || null;
  const ctaDescription = String(formData.get("ctaDescription") ?? "").trim() || null;
  const ctaStatement1 = String(formData.get("ctaStatement1") ?? "").trim() || null;
  const ctaStatement2 = String(formData.get("ctaStatement2") ?? "").trim() || null;
  const ctaButtonText = String(formData.get("ctaButtonText") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const usePhoneAsButtonLink = formData.get("usePhoneAsButtonLink") === "on";
  const facebookUrl = String(formData.get("facebookUrl") ?? "").trim() || null;
  const twitterUrl = String(formData.get("twitterUrl") ?? "").trim() || null;
  const instagramUrl = String(formData.get("instagramUrl") ?? "").trim() || null;
  const youtubeUrl = String(formData.get("youtubeUrl") ?? "").trim() || null;
  const pinterestUrl = String(formData.get("pinterestUrl") ?? "").trim() || null;
  const linkedinUrl = String(formData.get("linkedinUrl") ?? "").trim() || null;

  if (!name) return { ok: false, error: "Title is required." };

  try {
    if (imageAssetId && !(await prisma.asset.findFirst({ where: { id: imageAssetId, tenantId: TENANT_ID } }))) {
      return { ok: false, error: "Image asset not found for this tenant." };
    }
    const widget = await prisma.widget.create({
      data: {
        tenantId: TENANT_ID,
        name,
        title,
        url,
        html,
        keywords,
        companyId: companyId || null,
        imageAssetId,
        ctaDescription,
        ctaStatement1,
        ctaStatement2,
        ctaButtonText,
        phone,
        usePhoneAsButtonLink,
        facebookUrl,
        twitterUrl,
        instagramUrl,
        youtubeUrl,
        pinterestUrl,
        linkedinUrl,
      },
    });
    await logAudit({ action: "WIDGET_CREATE", entity: "Widget", entityId: widget.id, actorId: actor.id });
    revalidatePath("/admin/widgets");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create widget." };
  }
}

export async function updateWidget(id: string, formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("widgets");
  const title = String(formData.get("title") ?? "").trim();
  const name = title || String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim() || null;
  const html = sanitizeHtml(String(formData.get("html") ?? ""));
  const keywords = String(formData.get("keywords") ?? "").trim() || null;
  const companyId = String(formData.get("companyId") ?? "").trim() || null;
  const imageAssetId = String(formData.get("imageAssetId") ?? "").trim() || null;
  const ctaDescription = String(formData.get("ctaDescription") ?? "").trim() || null;
  const ctaStatement1 = String(formData.get("ctaStatement1") ?? "").trim() || null;
  const ctaStatement2 = String(formData.get("ctaStatement2") ?? "").trim() || null;
  const ctaButtonText = String(formData.get("ctaButtonText") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const usePhoneAsButtonLink = formData.get("usePhoneAsButtonLink") === "on";
  const facebookUrl = String(formData.get("facebookUrl") ?? "").trim() || null;
  const twitterUrl = String(formData.get("twitterUrl") ?? "").trim() || null;
  const instagramUrl = String(formData.get("instagramUrl") ?? "").trim() || null;
  const youtubeUrl = String(formData.get("youtubeUrl") ?? "").trim() || null;
  const pinterestUrl = String(formData.get("pinterestUrl") ?? "").trim() || null;
  const linkedinUrl = String(formData.get("linkedinUrl") ?? "").trim() || null;

  if (!name) return { ok: false, error: "Title is required." };

  try {
    if (imageAssetId && !(await prisma.asset.findFirst({ where: { id: imageAssetId, tenantId: TENANT_ID } }))) {
      return { ok: false, error: "Image asset not found for this tenant." };
    }
    const result = await prisma.widget.updateMany({
      where: { id, tenantId: TENANT_ID },
      data: {
        name,
        title,
        url,
        html,
        keywords,
        companyId: companyId || null,
        imageAssetId,
        ctaDescription,
        ctaStatement1,
        ctaStatement2,
        ctaButtonText,
        phone,
        usePhoneAsButtonLink,
        facebookUrl,
        twitterUrl,
        instagramUrl,
        youtubeUrl,
        pinterestUrl,
        linkedinUrl,
      },
    });
    if (!result.count) return { ok: false, error: "Widget not found." };
    await logAudit({ action: "WIDGET_UPDATE", entity: "Widget", entityId: id, actorId: actor.id });
    revalidatePath("/admin/widgets");
    revalidatePath(`/admin/widgets/${id}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update widget." };
  }
}

export async function deleteWidget(id: string): Promise<ActionResult> {
  const actor = await requireSection("widgets");
  try {
    const result = await prisma.widget.deleteMany({ where: { id, tenantId: TENANT_ID } });
    if (!result.count) return { ok: false, error: "Widget not found." };
    await logAudit({ action: "WIDGET_DELETE", entity: "Widget", entityId: id, actorId: actor.id });
    revalidatePath("/admin/widgets");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete widget." };
  }
}

export async function saveWidgetPlacements(widgetId: string, formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("widgets");
  const slots = formData.getAll("placementSlot").map((value) => String(value).trim());
  const orders = formData.getAll("placementOrder").map((value) => Number(value) || 0);
  const active = formData.getAll("placementEnabled").map((value) => String(value) === "true");
  if (!slots.every(Boolean)) return { ok: false, error: "Every placement needs a slot." };
  try {
    await prisma.$transaction(async (tx) => {
      const widget = await tx.widget.findFirst({ where: { id: widgetId, tenantId: TENANT_ID } });
      if (!widget) throw new Error("Widget not found.");
      await tx.widgetPlacement.deleteMany({ where: { widgetId } });
      if (slots.length) {
        await tx.widgetPlacement.createMany({
          data: slots.map((slot, index) => ({ widgetId, slot, order: orders[index] ?? index, active: active[index] ?? false })),
        });
      }
    });
    await logAudit({ action: "WIDGET_UPDATE", entity: "Widget", entityId: widgetId, actorId: actor.id, meta: { placements: slots.length } });
    revalidatePath(`/admin/widgets/${widgetId}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save placements." };
  }
}
