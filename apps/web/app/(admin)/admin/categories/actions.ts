"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { sanitizeHtml } from "@/lib/style-guide";
import { TENANT_ID } from "@/modules/shared";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function listCategories() {
  await requireSection("topics");
  return prisma.category.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { title: "asc" },
    include: {
      parent: { select: { id: true, title: true } },
      images: {
        where: { position: "PRIMARY" },
        take: 1,
        include: { imageAsset: { select: { id: true } } },
      },
    },
  });
}

export async function getCategory(id: string) {
  await requireSection("topics");
  return prisma.category.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: {
      images: {
        orderBy: { order: "asc" },
        include: { imageAsset: { select: { id: true, mimeType: true } } },
      },
    },
  });
}

export async function getCategoryOptions() {
  await requireSection("topics");
  return prisma.category.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });
}

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("topics");
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const author = String(formData.get("author") ?? "").trim() || null;

  if (!title) return { ok: false, error: "Title is required." };
  if (!slug) return { ok: false, error: "Slug is required." };

  try {
    const existing = await prisma.category.findFirst({ where: { tenantId: TENANT_ID, slug } });
    if (existing) return { ok: false, error: "A topic with that slug already exists." };

    await prisma.category.create({
      data: {
        tenantId: TENANT_ID,
        slug,
        title,
        description: description ? sanitizeHtml(description) : null,
        author,
        status: "LIVE",
      },
    });
    await logAudit({ action: "CATEGORY_CREATE", entity: "Category", entityId: slug, meta: { slug, title }, actorId: actor.id });
    revalidatePath("/admin/categories");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create topic." };
  }
}

export async function createCategoryForm(formData: FormData): Promise<void> {
  await createCategory(formData);
}

export async function updateCategory(id: string, formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("topics");
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const sectionsRaw = formData.get("sections");

  if (!title) return { ok: false, error: "Title is required." };
  if (!slug) return { ok: false, error: "Slug is required." };

  try {
    const clash = await prisma.category.findFirst({
      where: { tenantId: TENANT_ID, slug, NOT: { id } },
    });
    if (clash) return { ok: false, error: "A topic with that slug already exists." };

    let sections = undefined;
    if (sectionsRaw) {
      try {
        sections = JSON.parse(String(sectionsRaw));
      } catch { /* ignore parse errors */ }
    }

    await prisma.category.update({
      where: { id },
      data: {
        title,
        slug,
        author,
        description: description ? sanitizeHtml(description) : null,
        ...(sections !== undefined ? { sections } : {}),
      },
    });

    await logAudit({ action: "CATEGORY_UPDATE", entity: "Category", entityId: id, meta: { slug, title }, actorId: actor.id });
    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${id}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update topic." };
  }
}

export async function updateCategoryForm(id: string, formData: FormData): Promise<void> {
  await updateCategory(id, formData);
}

export async function deleteCategory(id: string): Promise<void> {
  await requireSection("topics");
  try {
    await prisma.category.delete({ where: { id } });
    await logAudit({ action: "CATEGORY_DELETE", entity: "Category", entityId: id });
    revalidatePath("/admin/categories");
  } catch { /* category may have relations */ }
}

export async function deleteCategoryForm(id: string): Promise<void> {
  await deleteCategory(id);
}

export async function updateCategorySections(id: string, sections: unknown[]): Promise<ActionResult> {
  const actor = await requireSection("topics");
  try {
    await prisma.category.update({
      where: { id },
      data: { sections },
    });
    await logAudit({ action: "CATEGORY_UPDATE", entity: "Category", entityId: id, meta: { field: "sections" }, actorId: actor.id });
    revalidatePath(`/admin/categories/${id}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save sections." };
  }
}
