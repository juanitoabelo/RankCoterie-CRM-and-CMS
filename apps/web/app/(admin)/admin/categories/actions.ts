"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
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
  const geoCategoryId = String(formData.get("geoCategoryWidget") ?? "").trim() || null;

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
        geoCategoryId,
        status: "LIVE",
      },
    });
    await logAudit({ action: "CATEGORY_CREATE", entity: "Category", entityId: slug, meta: { slug, title }, actorId: actor.id });
    revalidatePath("/admin/categories");
    revalidatePath(`/topic/${slug}`);
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
  const has = (key: string) => formData.get(key) !== null;
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const sectionsRaw = formData.get("sections");
  const featuredImageAssetId = String(formData.get("featuredImageAssetId") ?? "").trim() || null;
  const geoCategoryId = has("geoCategoryWidget")
    ? String(formData.get("geoCategoryWidget") ?? "").trim() || null
    : undefined;

  if (!title) return { ok: false, error: "Title is required." };
  if (!slug) return { ok: false, error: "Slug is required." };

  try {
    const existing = await prisma.category.findFirst({ where: { id, tenantId: TENANT_ID } });
    if (!existing) return { ok: false, error: "Topic not found." };

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

    // Only touch description when the form actually supplies it, so editing a
    // topic from a form that omits the field can't wipe the page intro.
    const nextDescription = has("description")
      ? description
        ? sanitizeHtml(description)
        : null
      : existing.description;

    await prisma.category.update({
      where: { id },
      data: {
        title,
        slug,
        author,
        description: nextDescription,
        ...(geoCategoryId !== undefined ? { geoCategoryId } : {}),
        ...(sections !== undefined ? { sections } : {}),
      },
    });

    // Persist the featured (PRIMARY) image when the form supplies one.
    if (featuredImageAssetId) {
      const existingImage = await prisma.categoryImage.findFirst({
        where: { tenantId: TENANT_ID, categoryId: id, position: "PRIMARY" },
      });
      if (existingImage) {
        await prisma.categoryImage.update({
          where: { id: existingImage.id },
          data: { imageAssetId: featuredImageAssetId },
        });
      } else {
        await prisma.categoryImage.create({
          data: {
            tenantId: TENANT_ID,
            categoryId: id,
            imageAssetId: featuredImageAssetId,
            position: "PRIMARY",
            isPrimary: true,
          },
        });
      }
    }

    await logAudit({ action: "CATEGORY_UPDATE", entity: "Category", entityId: id, meta: { slug, title }, actorId: actor.id });
    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${id}/edit`);
    revalidatePath(`/topic/${slug}`);
    if (existing.slug !== slug) revalidatePath(`/topic/${existing.slug}`);
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
    const row = await prisma.category.update({
      where: { id },
      data: { sections: sections as unknown as Prisma.InputJsonValue },
      select: { slug: true },
    });
    await logAudit({ action: "CATEGORY_UPDATE", entity: "Category", entityId: id, meta: { field: "sections" }, actorId: actor.id });
    revalidatePath(`/admin/categories/${id}/edit`);
    revalidatePath(`/topic/${row.slug}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save sections." };
  }
}
