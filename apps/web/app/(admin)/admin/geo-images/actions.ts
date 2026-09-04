"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/lib/admin-auth";
import { TENANT_ID } from "@/lib/tenant";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function listCategoryImages() {
  await requireSection("geoImages");
  return prisma.categoryImage.findMany({ where: { tenantId: TENANT_ID }, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

export async function getGeoImageOptions() {
  await requireSection("geoImages");
  const [categories, regions] = await Promise.all([
    prisma.category.findMany({ where: { tenantId: TENANT_ID }, orderBy: { title: "asc" }, select: { id: true, title: true, slug: true } }),
    prisma.region.findMany({ where: { tenantId: TENANT_ID }, orderBy: { slug: "asc" }, select: { id: true, slug: true, city: true, state: true } }),
  ]);
  return { categories, regions };
}

function readImage(formData: FormData) {
  return {
    categoryId: String(formData.get("categoryId") ?? "").trim() || null,
    regionId: String(formData.get("regionId") ?? "").trim() || null,
    imageAssetId: String(formData.get("imageAssetId") ?? "").trim(),
    position: String(formData.get("position") ?? "PRIMARY").trim() || "PRIMARY",
    order: Number(formData.get("order") ?? 0) || 0,
    isPrimary: formData.get("isPrimary") === "on",
  };
}

export async function createCategoryImage(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("geoImages");
  const data = readImage(formData);
  if (!data.imageAssetId) return { ok: false, error: "An image asset ID is required." };
  try {
    const asset = await prisma.asset.findFirst({ where: { id: data.imageAssetId, tenantId: TENANT_ID } });
    if (!asset) return { ok: false, error: "Image asset not found for this tenant." };
    const [category, region] = await Promise.all([
      data.categoryId ? prisma.category.findFirst({ where: { id: data.categoryId, tenantId: TENANT_ID } }) : null,
      data.regionId ? prisma.region.findFirst({ where: { id: data.regionId, tenantId: TENANT_ID } }) : null,
    ]);
    if (data.categoryId && !category) return { ok: false, error: "Category not found for this tenant." };
    if (data.regionId && !region) return { ok: false, error: "Region not found for this tenant." };
    const image = await prisma.categoryImage.create({ data: { tenantId: TENANT_ID, ...data } });
    await logAudit({ action: "CATEGORY_IMAGE_CREATE", entity: "CategoryImage", entityId: image.id, actorId: actor.id });
    revalidatePath("/admin/geo-images");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed to save category image." }; }
}

export async function createCategoryImageForm(formData: FormData): Promise<void> { await createCategoryImage(formData); }

export async function createCategoryImagesBulk(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("geoImages");
  const imageAssetIds = formData.getAll("imageAssetIds").map((value) => String(value).trim()).filter(Boolean);
  if (!imageAssetIds.length) return { ok: false, error: "Upload at least one image first." };
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const regionId = String(formData.get("regionId") ?? "").trim() || null;
  const position = String(formData.get("position") ?? "PRIMARY").trim() || "PRIMARY";
  try {
    const assets = await prisma.asset.findMany({ where: { id: { in: imageAssetIds }, tenantId: TENANT_ID }, select: { id: true } });
    if (assets.length !== imageAssetIds.length) return { ok: false, error: "One or more image assets do not belong to this tenant." };
    await prisma.categoryImage.createMany({ data: imageAssetIds.map((imageAssetId, index) => ({ tenantId: TENANT_ID, categoryId, regionId, imageAssetId, position, order: index, isPrimary: index === 0 })) });
    await logAudit({ action: "CATEGORY_IMAGE_CREATE", entity: "CategoryImage", entityId: imageAssetIds[0], actorId: actor.id, meta: { count: imageAssetIds.length } });
    revalidatePath("/admin/geo-images");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed to assign images." }; }
}

export async function deleteCategoryImageForm(formData: FormData): Promise<void> {
  const actor = await requireSection("geoImages");
  const id = String(formData.get("id") ?? "");
  try {
    const result = await prisma.categoryImage.deleteMany({ where: { id, tenantId: TENANT_ID } });
    if (result.count) await logAudit({ action: "CATEGORY_IMAGE_DELETE", entity: "CategoryImage", entityId: id, actorId: actor.id });
    revalidatePath("/admin/geo-images");
  } catch { /* The page remains usable; the next refresh shows the unchanged row. */ }
}
