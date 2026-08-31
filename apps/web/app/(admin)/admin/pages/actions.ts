"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createPage(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "DRAFT").trim();

  if (!name) return { ok: false, error: "Name is required." };
  if (!slug) return { ok: false, error: "Slug is required." };

  try {
    const row = await prisma.page.create({
      data: {
        tenantId: process.env.CANOPY_TENANT_ID ?? "tenant-masternet",
        name,
        slug,
        title: title || name,
        status,
        data: "[]",
      },
    });
    await logAudit({
      action: "PAGE_CREATE",
      entity: "Page",
      entityId: row.id,
      meta: { name, slug },
    });
    revalidatePath("/admin/pages");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create page." };
  }
}

export async function updatePageBlocks(
  pageId: string,
  blocksJson: string,
): Promise<ActionResult> {
  try {
    await prisma.page.update({
      where: { id: pageId },
      data: { data: blocksJson },
    });
    await logAudit({
      action: "PAGE_UPDATE",
      entity: "Page",
      entityId: pageId,
    });
    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${pageId}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save blocks." };
  }
}

export async function updatePageMeta(
  pageId: string,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "DRAFT").trim();

  if (!name) return { ok: false, error: "Name is required." };
  if (!slug) return { ok: false, error: "Slug is required." };

  try {
    await prisma.page.update({
      where: { id: pageId },
      data: { name, slug, title: title || name, status },
    });
    await logAudit({
      action: "PAGE_UPDATE",
      entity: "Page",
      entityId: pageId,
      meta: { name, slug },
    });
    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${pageId}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update page." };
  }
}

export async function deletePage(id: string, _formData: FormData): Promise<void> {
  try {
    await prisma.page.delete({ where: { id } });
    await logAudit({
      action: "PAGE_DELETE",
      entity: "Page",
      entityId: id,
    });
    revalidatePath("/admin/pages");
  } catch {
    // silently ignore
  }
}

export async function createPageForm(formData: FormData): Promise<void> {
  await createPage(formData);
}

export async function deletePageForm(id: string, _formData: FormData): Promise<void> {
  await deletePage(id, _formData);
}
