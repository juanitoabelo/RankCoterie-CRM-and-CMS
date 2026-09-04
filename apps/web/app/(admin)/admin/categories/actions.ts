"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/lib/admin-auth";
import { TENANT_ID } from "@/lib/tenant";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createCategory(formData: FormData): Promise<ActionResult> {
  await requireSection("categories");
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "LIVE").trim();
  const stateInit = String(formData.get("stateInit") ?? "").trim() || null;
  const stateDesc = String(formData.get("stateDesc") ?? "").trim() || null;
  const cityInit = String(formData.get("cityInit") ?? "").trim() || null;
  const cityDesc = String(formData.get("cityDesc") ?? "").trim() || null;

  if (!slug) return { ok: false, error: "Slug is required." };
  if (!title) return { ok: false, error: "Title is required." };

  try {
    const row = await prisma.category.create({
      data: {
        tenantId: TENANT_ID,
        slug,
        title,
        description,
        parentId: parentId || undefined,
        status,
        stateInit,
        stateDesc,
        cityInit,
        cityDesc,
      },
    });
    await logAudit({
      action: "CATEGORY_CREATE",
      entity: "Category",
      entityId: row.id,
      meta: { slug, title },
    });
    revalidatePath("/admin/categories");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create category." };
  }
}

export async function updateCategory(id: string, formData: FormData): Promise<ActionResult> {
  await requireSection("categories");
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "LIVE").trim();
  const stateInit = String(formData.get("stateInit") ?? "").trim() || null;
  const stateDesc = String(formData.get("stateDesc") ?? "").trim() || null;
  const cityInit = String(formData.get("cityInit") ?? "").trim() || null;
  const cityDesc = String(formData.get("cityDesc") ?? "").trim() || null;

  if (!slug) return { ok: false, error: "Slug is required." };
  if (!title) return { ok: false, error: "Title is required." };

  try {
    const row = await prisma.category.update({
      where: { id },
      data: {
        slug,
        title,
        description,
        parentId: parentId || null,
        status,
        stateInit,
        stateDesc,
        cityInit,
        cityDesc,
      },
    });
    await logAudit({
      action: "CATEGORY_UPDATE",
      entity: "Category",
      entityId: row.id,
      meta: { slug, title },
    });
    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${id}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update category." };
  }
}

export async function deleteCategory(id: string, _formData: FormData): Promise<void> {
  await requireSection("categories");
  try {
    await prisma.category.delete({ where: { id } });
    await logAudit({
      action: "CATEGORY_DELETE",
      entity: "Category",
      entityId: id,
    });
    revalidatePath("/admin/categories");
  } catch {
    // silently ignore — category may have relations
  }
}

export async function createCategoryForm(formData: FormData): Promise<void> {
  await createCategory(formData);
}

export async function updateCategoryForm(id: string, formData: FormData): Promise<void> {
  await updateCategory(id, formData);
}

export async function deleteCategoryForm(id: string, _formData: FormData): Promise<void> {
  await deleteCategory(id, _formData);
}
