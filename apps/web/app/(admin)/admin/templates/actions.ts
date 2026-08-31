"use server";

import { revalidatePath } from "next/cache";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createTemplate(formData: FormData): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const slug = String(formData.get("slug") ?? "").trim()
    || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (!title) return { ok: false, error: "Title is required." };
  if (!body) return { ok: false, error: "Body is required." };

  try {
    const row = await prisma.contentTemplate.create({
      data: {
        tenantId: process.env.CANOPY_TENANT_ID ?? "tenant-masternet",
        title,
        slug,
        body,
        categoryId: categoryId || undefined,
        status: "DRAFT",
      },
    });
    await logAudit({
      action: "TEMPLATE_CREATE",
      entity: "ContentTemplate",
      entityId: row.id,
      meta: { title },
    });
    revalidatePath("/admin/templates");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create template." };
  }
}

export async function updateTemplate(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "DRAFT").trim();
  const slug = String(formData.get("slug") ?? "").trim()
    || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (!title) return { ok: false, error: "Title is required." };
  if (!body) return { ok: false, error: "Body is required." };

  try {
    await prisma.contentTemplate.update({
      where: { id },
      data: { title, slug, body, categoryId: categoryId || null, status: status as ContentStatus },
    });
    await logAudit({
      action: "TEMPLATE_UPDATE",
      entity: "ContentTemplate",
      entityId: id,
      meta: { title },
    });
    revalidatePath("/admin/templates");
    revalidatePath(`/admin/templates/${id}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update template." };
  }
}

export async function deleteTemplate(id: string, _formData: FormData): Promise<void> {
  try {
    await prisma.contentVariant.deleteMany({ where: { templateId: id } });
    await prisma.contentTemplate.delete({ where: { id } });
    await logAudit({
      action: "TEMPLATE_DELETE",
      entity: "ContentTemplate",
      entityId: id,
    });
    revalidatePath("/admin/templates");
  } catch {
    // silently ignore
  }
}

export async function createTemplateForm(formData: FormData): Promise<void> {
  await createTemplate(formData);
}

export async function deleteTemplateForm(id: string, _formData: FormData): Promise<void> {
  await deleteTemplate(id, _formData);
}
