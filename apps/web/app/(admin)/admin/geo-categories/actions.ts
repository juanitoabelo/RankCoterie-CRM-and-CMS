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
      regionContent: {
        orderBy: [{ state: "asc" }, { areaPart: "asc" }],
        select: { state: true, areaPart: true, customText: true },
      },
      contentSections: { select: { id: true } },
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

const AREA_PARTS = ["NORTHERN", "SOUTHERN", "EASTERN", "WESTERN", "CENTRAL"] as const;

type AltRow = { state: string; areaPart: (typeof AREA_PARTS)[number]; customText: string };

type SeoFields = {
  seoTitle: string | null;
  metaDesc: string | null;
  metaKeywords: string; // JSON array, stored as text (Page content type parity)
  focusKeyphrase: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
  jsonSchema: string | null;
};

/** Parse the SeoFields (SEO / Advanced / Schema tabs) out of the form. */
function parseSeoFields(formData: FormData): { seo: SeoFields } | { error: string } {
  const jsonSchema = String(formData.get("jsonSchema") ?? "").trim() || null;
  if (jsonSchema) {
    try {
      JSON.parse(jsonSchema);
    } catch {
      return { error: "Schema: JSON-LD must be valid JSON." };
    }
  }

  const rawKeywords = String(formData.get("metaKeywords") ?? "[]").trim() || "[]";
  let keywords: string[];
  try {
    const parsed = JSON.parse(rawKeywords);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    keywords = parsed.map(String);
  } catch {
    return { error: "SEO: meta keywords must be a valid list." };
  }

  const robotsIndexRaw = formData.get("robotsIndex");
  const robotsFollowRaw = formData.get("robotsFollow");
  return {
    seo: {
      seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
      metaDesc: String(formData.get("metaDesc") ?? "").trim() || null,
      metaKeywords: JSON.stringify(keywords),
      focusKeyphrase: String(formData.get("focusKeyphrase") ?? "").trim() || null,
      ogImage: String(formData.get("ogImage") ?? "").trim() || null,
      canonicalUrl: String(formData.get("canonicalUrl") ?? "").trim() || null,
      robotsIndex: robotsIndexRaw === null ? true : robotsIndexRaw === "true",
      robotsFollow: robotsFollowRaw === null ? true : robotsFollowRaw === "true",
      jsonSchema,
    },
  };
}

function parseSectionIds(formData: FormData): string[] {
  return Array.from(new Set(formData.getAll("sectionIds").map((v) => String(v).trim()).filter(Boolean)));
}

function parseAltRows(formData: FormData): { rows: AltRow[]; error?: string } {
  const altCount = Number(formData.get("altCount") ?? 0) || 0;
  const rows: AltRow[] = [];
  for (let i = 0; i < altCount; i++) {
    const state = String(formData.get(`altState_${i}`) ?? "").trim();
    const areaPart = String(formData.get(`altArea_${i}`) ?? "").trim().toUpperCase();
    const customText = String(formData.get(`altContent_${i}`) ?? "").trim();
    if (!state && !areaPart && !customText) continue;
    if (!state || !areaPart || !customText) {
      return { rows: [], error: `Complete or remove alternate intro row ${i + 1}.` };
    }
    if (!(AREA_PARTS as readonly string[]).includes(areaPart)) {
      return { rows: [], error: `Invalid geographical area on alternate intro row ${i + 1}.` };
    }
    rows.push({ state, areaPart: areaPart as (typeof AREA_PARTS)[number], customText });
  }
  const comboKeys = new Set<string>();
  for (const row of rows) {
    const key = `${row.state}|${row.areaPart}`;
    if (comboKeys.has(key)) {
      return { rows: [], error: `Duplicate alternate intro for ${row.state} / ${row.areaPart}.` };
    }
    comboKeys.add(key);
  }
  return { rows };
}

async function findUnknownState(rows: AltRow[]): Promise<string | null> {
  if (!rows.length) return null;
  const validStates = await prisma.region.findMany({
    where: { tenantId: TENANT_ID, city: null },
    select: { state: true },
  });
  const stateSet = new Set(validStates.map((r) => r.state));
  const invalid = rows.find((r) => !stateSet.has(r.state));
  return invalid ? `Unknown state "${invalid.state}" on an alternate intro.` : null;
}

export async function getGeoCategoryFormOptions(categoryId?: string) {
  await requireSection("categories");
  const [sections, stateRegions] = await Promise.all([
    prisma.section.findMany({
      where: categoryId
        ? { tenantId: TENANT_ID, OR: [{ categoryId: null }, { categoryId }] }
        : { tenantId: TENANT_ID, categoryId: null },
      orderBy: [{ order: "asc" }, { title: "asc" }],
      select: { id: true, title: true, status: true },
    }),
    prisma.region.findMany({
      where: { tenantId: TENANT_ID, city: null },
      orderBy: { state: "asc" },
      distinct: ["state"],
      select: { state: true, stateFull: true },
    }),
  ]);
  return { sections, states: stateRegions };
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

  const sectionIds = parseSectionIds(formData);
  const parsedAlt = parseAltRows(formData);
  if (parsedAlt.error) return { ok: false, error: parsedAlt.error };
  const altRows = parsedAlt.rows;

  const parsedSeo = parseSeoFields(formData);
  if ("error" in parsedSeo) return { ok: false, error: parsedSeo.error };

  try {
    const unknownState = await findUnknownState(altRows);
    if (unknownState) return { ok: false, error: unknownState };

    let eligibleSections: { id: string }[] = [];
    if (sectionIds.length) {
      eligibleSections = await prisma.section.findMany({
        where: { id: { in: sectionIds }, tenantId: TENANT_ID, categoryId: null },
        select: { id: true },
      });
      if (eligibleSections.length !== sectionIds.length) {
        return { ok: false, error: "Some selected sections are no longer available." };
      }
    }

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
        ...parsedSeo.seo,
      },
    });

    if (altRows.length) {
      await prisma.categoryRegionContent.createMany({
        data: altRows.map((r) => ({ categoryId: row.id, state: r.state, areaPart: r.areaPart, customText: r.customText })),
      });
    }

    if (eligibleSections.length) {
      await prisma.section.updateMany({
        where: { id: { in: eligibleSections.map((s) => s.id) }, tenantId: TENANT_ID, categoryId: null },
        data: { categoryId: row.id },
      });
    }

    await logAudit({
      action: "CATEGORY_CREATE",
      entity: "Category",
      entityId: row.id,
      meta: { slug, title, altIntroCount: altRows.length, sectionIds: eligibleSections.map((s) => s.id) },
      actorId: actor.id,
    });
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

  const sectionIds = parseSectionIds(formData);
  const parsedAlt = parseAltRows(formData);
  if (parsedAlt.error) return { ok: false, error: parsedAlt.error };
  const altRows = parsedAlt.rows;

  const parsedSeo = parseSeoFields(formData);
  if ("error" in parsedSeo) return { ok: false, error: parsedSeo.error };

  try {
    const unknownState = await findUnknownState(altRows);
    if (unknownState) return { ok: false, error: unknownState };

    let eligibleSectionIds: string[] = [];
    if (sectionIds.length) {
      const eligible = await prisma.section.findMany({
        where: { id: { in: sectionIds }, tenantId: TENANT_ID, OR: [{ categoryId: null }, { categoryId: id }] },
        select: { id: true },
      });
      if (eligible.length !== sectionIds.length) {
        return { ok: false, error: "Some selected sections are no longer available." };
      }
      eligibleSectionIds = eligible.map((s) => s.id);
    }

    await prisma.category.update({
      where: { id },
      data: { slug, title, description, stateInit, stateDesc, cityInit, cityDesc, ...parsedSeo.seo },
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

    const keepKeys = new Set(altRows.map((r) => `${r.state}|${r.areaPart}`));
    const existingAlt = await prisma.categoryRegionContent.findMany({
      where: { categoryId: id },
      select: { id: true, state: true, areaPart: true },
    });
    for (const row of altRows) {
      await prisma.categoryRegionContent.upsert({
        where: { categoryId_state_areaPart: { categoryId: id, state: row.state, areaPart: row.areaPart } },
        create: { categoryId: id, state: row.state, areaPart: row.areaPart, customText: row.customText },
        update: { customText: row.customText },
      });
    }
    const altIdsToDelete = existingAlt.filter((e) => !keepKeys.has(`${e.state}|${e.areaPart}`)).map((e) => e.id);
    if (altIdsToDelete.length) {
      await prisma.categoryRegionContent.deleteMany({ where: { id: { in: altIdsToDelete } } });
    }

    const currentlyAssigned = await prisma.section.findMany({
      where: { categoryId: id, tenantId: TENANT_ID },
      select: { id: true },
    });
    const assignedSet = new Set(currentlyAssigned.map((s) => s.id));
    const toAssign = eligibleSectionIds.filter((sid) => !assignedSet.has(sid));
    const toUnassign = currentlyAssigned.map((s) => s.id).filter((sid) => !sectionIds.includes(sid));
    if (toAssign.length) {
      await prisma.section.updateMany({
        where: { id: { in: toAssign }, tenantId: TENANT_ID, categoryId: null },
        data: { categoryId: id },
      });
    }
    if (toUnassign.length) {
      await prisma.section.updateMany({
        where: { id: { in: toUnassign }, tenantId: TENANT_ID, categoryId: id },
        data: { categoryId: null },
      });
    }

    await logAudit({
      action: "CATEGORY_UPDATE",
      entity: "Category",
      entityId: id,
      meta: { slug, title, altIntroCount: altRows.length, sectionIds },
      actorId: actor.id,
    });
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

export async function deleteGeoCategoryImageForm(imageId: string): Promise<void> {
  const actor = await requireSection("categories");
  const id = imageId;
  try {
    await prisma.categoryImage.deleteMany({ where: { id, tenantId: TENANT_ID } });
    await logAudit({ action: "CATEGORY_IMAGE_DELETE", entity: "CategoryImage", entityId: id, actorId: actor.id });
    revalidatePath("/admin/geo-categories");
  } catch { /* ignore */ }
}
