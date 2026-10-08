"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/lib/tenant";
import { requireSection } from "@/modules/auth";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function getFeaturedPlacements() {
  await requireSection("featuredPlacements");
  return prisma.featuredPlacement.findMany({
    where: { tenantId: TENANT_ID },
    include: {
      category: { select: { title: true, slug: true } },
      region: { select: { stateFull: true, slug: true } },
      _count: { select: { purchases: true } },
    },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  });
}

export async function getFeaturedPlacement(id: string) {
  await requireSection("featuredPlacements");
  return prisma.featuredPlacement.findUnique({
    where: { id, tenantId: TENANT_ID },
    include: {
      category: { select: { title: true, slug: true } },
      region: { select: { stateFull: true, slug: true } },
      purchases: {
        include: {
          listing: { select: { title: true, slug: true, tier: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function createFeaturedPlacement(formData: FormData): Promise<ActionResult> {
  await requireSection("featuredPlacements");
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v ? Number(v) : undefined;
  };

  const type = formData.get("type") as string;
  const slug = str("slug")!;
  const label = str("label")!;
  const description = str("description");
  const priceMonthly = num("priceMonthly")!;
  const priceQuarterly = num("priceQuarterly");
  const priceAnnually = num("priceAnnually");
  const currency = str("currency") ?? "USD";
  const maxSlots = num("maxSlots") ?? 1;
  const categoryId = str("categoryId");
  const regionId = str("regionId");
  const startsAt = formData.get("startsAt") ? new Date(String(formData.get("startsAt"))) : null;
  const endsAt = formData.get("endsAt") ? new Date(String(formData.get("endsAt"))) : null;
  const status = (formData.get("status") as string) ?? "AVAILABLE";

  if (!slug || !label || !type) {
    return { ok: false, error: "Type, slug, and label are required." };
  }

  try {
    const existing = await prisma.featuredPlacement.findUnique({
      where: { tenantId: TENANT_ID, slug },
    });
    if (existing) return { ok: false, error: `Slug "${slug}" already exists.` };

    const placement = await prisma.featuredPlacement.create({
      data: {
        tenantId: TENANT_ID,
        type,
        slug,
        label,
        description,
        priceMonthly,
        priceQuarterly,
        priceAnnually,
        currency,
        maxSlots,
        categoryId,
        regionId,
        startsAt,
        endsAt,
        status,
      },
    });

    await logAudit({
      action: "FEATURED_PLACEMENT_CREATE",
      entity: "FeaturedPlacement",
      entityId: placement.id,
      meta: { type, slug, label },
    });

    revalidatePath("/admin/featured-placements");
    return { ok: true, id: placement.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create featured placement." };
  }
}

export async function updateFeaturedPlacement(id: string, formData: FormData): Promise<ActionResult> {
  await requireSection("featuredPlacements");
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v ? Number(v) : undefined;
  };

  const type = formData.get("type") as string;
  const slug = str("slug")!;
  const label = str("label")!;
  const description = str("description");
  const priceMonthly = num("priceMonthly")!;
  const priceQuarterly = num("priceQuarterly");
  const priceAnnually = num("priceAnnually");
  const currency = str("currency") ?? "USD";
  const maxSlots = num("maxSlots") ?? 1;
  const categoryId = str("categoryId");
  const regionId = str("regionId");
  const startsAt = formData.get("startsAt") ? new Date(String(formData.get("startsAt"))) : null;
  const endsAt = formData.get("endsAt") ? new Date(String(formData.get("endsAt"))) : null;
  const status = (formData.get("status") as string) ?? "AVAILABLE";

  if (!slug || !label || !type) {
    return { ok: false, error: "Type, slug, and label are required." };
  }

  try {
    const dup = await prisma.featuredPlacement.findFirst({
      where: { slug, tenantId: TENANT_ID, id: { not: id } },
    });
    if (dup) return { ok: false, error: `Slug "${slug}" already exists.` };

    await prisma.featuredPlacement.update({
      where: { id, tenantId: TENANT_ID },
      data: {
        type,
        slug,
        label,
        description,
        priceMonthly,
        priceQuarterly,
        priceAnnually,
        currency,
        maxSlots,
        categoryId,
        regionId,
        startsAt,
        endsAt,
        status,
      },
    });

    await logAudit({
      action: "FEATURED_PLACEMENT_UPDATE",
      entity: "FeaturedPlacement",
      entityId: id,
      meta: { type, slug, label },
    });

    revalidatePath("/admin/featured-placements");
    revalidatePath(`/admin/featured-placements/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update featured placement." };
  }
}

export async function deleteFeaturedPlacement(id: string): Promise<ActionResult> {
  await requireSection("featuredPlacements");
  try {
    await prisma.featuredPlacement.delete({ where: { id, tenantId: TENANT_ID } });
    await logAudit({
      action: "FEATURED_PLACEMENT_DELETE",
      entity: "FeaturedPlacement",
      entityId: id,
    });
    revalidatePath("/admin/featured-placements");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete featured placement." };
  }
}

export async function getCategoriesForSelect() {
  await requireSection("featuredPlacements");
  return prisma.category.findMany({
    where: { tenantId: TENANT_ID, status: "LIVE" },
    select: { id: true, title: true, slug: true },
    orderBy: { title: "asc" },
  });
}

export async function getRegionsForSelect() {
  await requireSection("featuredPlacements");
  return prisma.region.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, stateFull: true, slug: true, state: true },
    orderBy: [{ priority: "asc" }, { stateFull: "asc" }],
  });
}

export async function getFeaturedPlacementTypes() {
  return [
    { value: "HOME_HERO", label: "Homepage Hero (1 slot)" },
    { value: "HOME_FEATURED", label: "Homepage Featured Grid (3 slots)" },
    { value: "CATEGORY_TOP", label: "Category Top Banner (1 per category)" },
    { value: "CATEGORY_FEATURED", label: "Category Featured Grid (3 per category)" },
    { value: "REGION_SPOTLIGHT", label: "Region Spotlight (1 per region)" },
    { value: "SEARCH_TOP", label: "Search Results Top (2 slots)" },
  ];
}

export async function getFeaturedPlacementStatuses() {
  return [
    { value: "AVAILABLE", label: "Available" },
    { value: "RESERVED", label: "Reserved" },
    { value: "ACTIVE", label: "Active" },
    { value: "EXPIRED", label: "Expired" },
    { value: "CANCELLED", label: "Cancelled" },
  ];
}