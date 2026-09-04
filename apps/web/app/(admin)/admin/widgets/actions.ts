"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/lib/admin-auth";
import { sanitizeHtml } from "@/lib/style-guide";
import { TENANT_ID } from "@/lib/tenant";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function listWidgets() {
  await requireSection("widgets");
  return prisma.widget.findMany({ where: { tenantId: TENANT_ID }, include: { placements: true }, orderBy: { name: "asc" } });
}

export async function getWidget(id: string) {
  await requireSection("widgets");
  return prisma.widget.findFirst({ where: { id, tenantId: TENANT_ID }, include: { placements: { orderBy: { order: "asc" } } } });
}

function readWidget(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const html = sanitizeHtml(String(formData.get("html") ?? ""));
  return { name, html, imageAssetId: String(formData.get("imageAssetId") ?? "").trim() || null, redirectUrl: String(formData.get("redirectUrl") ?? "").trim() || null, active: formData.get("active") === "on" };
}

export async function createWidget(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("widgets");
  const data = readWidget(formData);
  if (!data.name || !data.html) return { ok: false, error: "Name and HTML are required." };
  try {
    if (data.imageAssetId && !(await prisma.asset.findFirst({ where: { id: data.imageAssetId, tenantId: TENANT_ID } }))) return { ok: false, error: "Image asset not found for this tenant." };
    const widget = await prisma.widget.create({ data: { tenantId: TENANT_ID, ...data } });
    await logAudit({ action: "WIDGET_CREATE", entity: "Widget", entityId: widget.id, actorId: actor.id });
    revalidatePath("/admin/widgets");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed to create widget." }; }
}

export async function createWidgetForm(formData: FormData): Promise<void> { await createWidget(formData); }

export async function updateWidget(id: string, formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("widgets");
  const data = readWidget(formData);
  if (!data.name || !data.html) return { ok: false, error: "Name and HTML are required." };
  try {
    if (data.imageAssetId && !(await prisma.asset.findFirst({ where: { id: data.imageAssetId, tenantId: TENANT_ID } }))) return { ok: false, error: "Image asset not found for this tenant." };
    const result = await prisma.widget.updateMany({ where: { id, tenantId: TENANT_ID }, data });
    if (!result.count) return { ok: false, error: "Widget not found." };
    await logAudit({ action: "WIDGET_UPDATE", entity: "Widget", entityId: id, actorId: actor.id });
    revalidatePath("/admin/widgets");
    revalidatePath(`/admin/widgets/${id}/edit`);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed to update widget." }; }
}

export async function updateWidgetForm(formData: FormData): Promise<void> { await updateWidget(String(formData.get("id") ?? ""), formData); }

export async function deleteWidget(id: string): Promise<ActionResult> {
  const actor = await requireSection("widgets");
  try {
    const result = await prisma.widget.deleteMany({ where: { id, tenantId: TENANT_ID } });
    if (!result.count) return { ok: false, error: "Widget not found." };
    await logAudit({ action: "WIDGET_DELETE", entity: "Widget", entityId: id, actorId: actor.id });
    revalidatePath("/admin/widgets");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed to delete widget." }; }
}

export async function deleteWidgetForm(formData: FormData): Promise<void> { await deleteWidget(String(formData.get("id") ?? "")); }

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
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed to save placements." }; }
}

export async function saveWidgetPlacementsForm(formData: FormData): Promise<void> {
  await saveWidgetPlacements(String(formData.get("widgetId") ?? ""), formData);
}
