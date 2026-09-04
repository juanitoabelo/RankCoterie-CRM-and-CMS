"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/lib/admin-auth";
import { sanitizeHtml } from "@/lib/style-guide";
import { TENANT_ID } from "@/lib/tenant";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function actorId(): Promise<string | null> {
  const u = await requireSection("sections");
  return u.id;
}

export async function listSections() {
  await requireSection("sections");
  return prisma.section.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: [{ order: "asc" }, { title: "asc" }],
  });
}

export async function createSection(formData: FormData): Promise<ActionResult> {
  const actor = await actorId();
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const heading = String(formData.get("heading") ?? "").trim();
  const body = sanitizeHtml(String(formData.get("body") ?? ""));
  const status = String(formData.get("status") ?? "LIVE");
  const order = Number(formData.get("order") ?? 0) || 0;

  if (!slug || !title) return { ok: false, error: "Slug and title are required." };
  try {
    const existing = await prisma.section.findFirst({ where: { tenantId: TENANT_ID, slug } });
    if (existing) return { ok: false, error: "A section with that slug already exists." };
    await prisma.section.create({
      data: { tenantId: TENANT_ID, slug, title, heading: heading || null, body: body || null, status, order },
    });
    await logAudit({ action: "SECTION_CREATE", entity: "Section", entityId: slug, actorId: actor });
    revalidatePath("/admin/sections");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create section." };
  }
}

export async function createSectionForm(formData: FormData): Promise<void> {
  await createSection(formData);
}

export async function updateSection(id: string, formData: FormData): Promise<ActionResult> {
  const actor = await actorId();
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const heading = String(formData.get("heading") ?? "").trim();
  const body = sanitizeHtml(String(formData.get("body") ?? ""));
  const status = String(formData.get("status") ?? "LIVE");
  const order = Number(formData.get("order") ?? 0) || 0;

  if (!slug || !title) return { ok: false, error: "Slug and title are required." };
  try {
    const clash = await prisma.section.findFirst({
      where: { tenantId: TENANT_ID, slug, NOT: { id } },
    });
    if (clash) return { ok: false, error: "A section with that slug already exists." };
    const result = await prisma.section.updateMany({
      where: { id, tenantId: TENANT_ID },
      data: { slug, title, heading: heading || null, body: body || null, status, order },
    });
    if (!result.count) return { ok: false, error: "Section not found." };
    await logAudit({ action: "SECTION_UPDATE", entity: "Section", entityId: id, actorId: actor });
    revalidatePath("/admin/sections");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update section." };
  }
}

export async function updateSectionForm(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await updateSection(id, formData);
}

export async function deleteSection(id: string): Promise<ActionResult> {
  const actor = await actorId();
  try {
    const result = await prisma.section.deleteMany({ where: { id, tenantId: TENANT_ID } });
    if (!result.count) return { ok: false, error: "Section not found." };
    await logAudit({ action: "SECTION_DELETE", entity: "Section", entityId: id, actorId: actor });
    revalidatePath("/admin/sections");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete section." };
  }
}

export async function deleteSectionForm(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await deleteSection(id);
}
