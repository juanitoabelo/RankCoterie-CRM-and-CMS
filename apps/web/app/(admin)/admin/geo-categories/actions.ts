"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function listGeoCategories() {
  await requireSection("categories");
  const categories = await prisma.category.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { title: "asc" },
    include: {
      images: {
        orderBy: { order: "asc" },
        include: { imageAsset: { select: { id: true, mimeType: true } } },
      },
    },
  });
  return categories;
}

export async function getGeoCategory(id: string) {
  await requireSection("categories");
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

export async function getGeoCategoryOptions() {
  await requireSection("categories");
  const [categories, regions] = await Promise.all([
    prisma.category.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.region.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: { slug: "asc" },
      select: { id: true, slug: true, city: true, state: true },
    }),
  ]);
  return { categories, regions };
}

export async function createGeoCategory(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("categories");
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const stateInit = String(formData.get("stateInit") ?? "").trim() || null;
  const stateDesc = String(formData.get("stateDesc") ?? "").trim() || null;
  const cityInit = String(formData.get("cityInit") ?? "").trim() || null;
  const cityDesc = String(formData.get("cityDesc") ?? "").trim() || null;

  if (!title) return { ok: false, error: "Title is required." };
  if (!slug) return { ok: false, error: "Slug is required." };

  try {
    const row = await prisma.category.create({
      data: {
        tenantId: TENANT_ID,
        slug,
        title,
        description,
        stateInit,
        stateDesc,
        cityInit,
        cityDesc,
        status: "LIVE",
      },
    });
    await logAudit({ action: "CATEGORY_CREATE", entity: "Category", entityId: row.id, meta: { slug, title }, actorId: actor.id });
    revalidatePath("/admin/geo-categories");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create geo category." };
  }
}

export async function createGeoCategoryForm(formData: FormData): Promise<void> {
  await createGeoCategory(formData);
}

export async function updateGeoCategory(id: string, formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("categories");
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const stateInit = String(formData.get("stateInit") ?? "").trim() || null;
  const stateDesc = String(formData.get("stateDesc") ?? "").trim() || null;
  const cityInit = String(formData.get("cityInit") ?? "").trim() || null;
  const cityDesc = String(formData.get("cityDesc") ?? "").trim() || null;

  const parentImageAssetId = String(formData.get("parentImageAssetId") ?? "").trim() || null;
  const stateImageAssetId = String(formData.get("stateImageAssetId") ?? "").trim() || null;
  const cityImageAssetId = String(formData.get("cityImageAssetId") ?? "").trim() || null;

  if (!title) return { ok: false, error: "Title is required." };
  if (!slug) return { ok: false, error: "Slug is required." };

  try {
    await prisma.category.update({
      where: { id },
      data: { slug, title, description, stateInit, stateDesc, cityInit, cityDesc },
    });

    const imageUpdates = [
      { position: "PRIMARY", assetId: parentImageAssetId },
      { position: "STATE", assetId: stateImageAssetId },
      { position: "CITY", assetId: cityImageAssetId },
    ];

    for (const { position, assetId } of imageUpdates) {
      if (!assetId) continue;
      const existing = await prisma.categoryImage.findFirst({
        where: { tenantId: TENANT_ID, categoryId: id, position },
      });
      if (existing) {
        await prisma.categoryImage.update({ where: { id: existing.id }, data: { imageAssetId: assetId } });
      } else {
        await prisma.categoryImage.create({
          data: { tenantId: TENANT_ID, categoryId: id, imageAssetId: assetId, position, isPrimary: position === "PRIMARY" },
        });
      }
    }

    await logAudit({ action: "CATEGORY_UPDATE", entity: "Category", entityId: id, meta: { slug, title }, actorId: actor.id });
    revalidatePath("/admin/geo-categories");
    revalidatePath(`/admin/geo-categories/${id}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update geo category." };
  }
}

export async function updateGeoCategoryForm(id: string, formData: FormData): Promise<void> {
  await updateGeoCategory(id, formData);
}

export async function deleteGeoCategory(id: string): Promise<void> {
  await requireSection("categories");
  try {
    await prisma.category.delete({ where: { id } });
    await logAudit({ action: "CATEGORY_DELETE", entity: "Category", entityId: id });
    revalidatePath("/admin/geo-categories");
  } catch { /* category may have relations */ }
}

export async function deleteGeoCategoryForm(id: string): Promise<void> {
  await deleteGeoCategory(id);
}

export async function createGeoCategoryImage(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("categories");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const regionId = String(formData.get("regionId") ?? "").trim() || null;
  const imageAssetId = String(formData.get("imageAssetId") ?? "").trim();
  const position = String(formData.get("position") ?? "PRIMARY").trim() || "PRIMARY";

  if (!categoryId) return { ok: false, error: "Category is required." };
  if (!imageAssetId) return { ok: false, error: "Image is required." };

  try {
    const asset = await prisma.asset.findFirst({ where: { id: imageAssetId, tenantId: TENANT_ID } });
    if (!asset) return { ok: false, error: "Image asset not found." };

    const existing = await prisma.categoryImage.findFirst({
      where: { tenantId: TENANT_ID, categoryId, regionId: regionId || null, position },
    });

    if (existing) {
      await prisma.categoryImage.update({
        where: { id: existing.id },
        data: { imageAssetId },
      });
    } else {
      await prisma.categoryImage.create({
        data: { tenantId: TENANT_ID, categoryId, regionId: regionId || null, imageAssetId, position, isPrimary: position === "PRIMARY" },
      });
    }

    await logAudit({ action: "CATEGORY_IMAGE_CREATE", entity: "CategoryImage", entityId: categoryId, actorId: actor.id });
    revalidatePath("/admin/geo-categories");
    revalidatePath("/admin/geo-categories/images/new");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save image." };
  }
}

export async function createGeoCategoryImageForm(formData: FormData): Promise<void> {
  await createGeoCategoryImage(formData);
}

export async function bulkCreateGeoCategoryImages(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("categories");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  if (!categoryId) return { ok: false, error: "Category is required." };

  const count = Number(formData.get("rowCount") ?? 0);
  const rows: { imageAssetId: string; position: string; titleAlt: string }[] = [];

  for (let i = 0; i < count; i++) {
    const assetId = String(formData.get(`imageAssetId_${i}`) ?? "").trim();
    const position = String(formData.get(`position_${i}`) ?? "STATE").trim();
    const titleAlt = String(formData.get(`titleAlt_${i}`) ?? "").trim();
    if (assetId) {
      rows.push({ imageAssetId: assetId, position, titleAlt });
    }
  }

  if (!rows.length) return { ok: false, error: "Upload at least one image." };

  try {
    const assets = await prisma.asset.findMany({
      where: { id: { in: rows.map((r) => r.imageAssetId) }, tenantId: TENANT_ID },
      select: { id: true },
    });
    if (assets.length !== rows.length) return { ok: false, error: "One or more images not found." };

    for (const row of rows) {
      const existing = await prisma.categoryImage.findFirst({
        where: { tenantId: TENANT_ID, categoryId, position: row.position },
      });
      if (existing) {
        await prisma.categoryImage.update({ where: { id: existing.id }, data: { imageAssetId: row.imageAssetId } });
      } else {
        await prisma.categoryImage.create({
          data: { tenantId: TENANT_ID, categoryId, imageAssetId: row.imageAssetId, position: row.position, isPrimary: row.position === "PRIMARY" },
        });
      }
    }

    await logAudit({ action: "CATEGORY_IMAGE_CREATE", entity: "CategoryImage", entityId: categoryId, actorId: actor.id, meta: { count: rows.length } });
    revalidatePath("/admin/geo-categories");
    revalidatePath("/admin/geo-categories/images/bulk");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to process bulk images." };
  }
}

export async function bulkCreateGeoCategoryImagesForm(formData: FormData): Promise<void> {
  await bulkCreateGeoCategoryImages(formData);
}

export async function deleteGeoCategoryImageForm(formData: FormData): Promise<void> {
  const actor = await requireSection("categories");
  const id = String(formData.get("id") ?? "");
  try {
    await prisma.categoryImage.deleteMany({ where: { id, tenantId: TENANT_ID } });
    await logAudit({ action: "CATEGORY_IMAGE_DELETE", entity: "CategoryImage", entityId: id, actorId: actor.id });
    revalidatePath("/admin/geo-categories");
  } catch { /* ignore */ }
}
