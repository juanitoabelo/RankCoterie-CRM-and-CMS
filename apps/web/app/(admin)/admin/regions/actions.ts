"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

const AREA_PARTS = ["ALL", "NORTHERN", "SOUTHERN", "EASTERN", "WESTERN", "CENTRAL"] as const;
type AreaPart = (typeof AREA_PARTS)[number] | null;

function parseAreaPart(value: string | null): AreaPart {
  if (!value) return null;
  return (AREA_PARTS as readonly string[]).includes(value) ? (value as AreaPart) : null;
}

function slugify(input: string | null): string {
  if (!input) return "";
  return input
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase();
}

const slugifyLegacy = (state: string, stateFull: string, city: string | null) =>
  city ? `${slugify(city)}-${slugify(stateFull)}-${state}` : `${slugify(stateFull)}-${state}`;

export async function createRegion(formData: FormData): Promise<ActionResult> {
  const state = String(formData.get("state") ?? "").trim().toUpperCase();
  const stateFull = String(formData.get("stateFull") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const areaPart = parseAreaPart(String(formData.get("areaPart") ?? "").trim() || null);
  const priorityRaw = Number(formData.get("priority") ?? 999);
  const priority = Number.isFinite(priorityRaw) ? priorityRaw : 999;
  const custom1 = String(formData.get("custom1") ?? "").trim() || null;
  const custom2 = String(formData.get("custom2") ?? "").trim() || null;
  const zipRaw = String(formData.get("zipCodes") ?? "").trim();
  const zipCodes = zipRaw
    .split(",")
    .map((z) => z.trim())
    .filter(Boolean);

  if (!state) return { ok: false, error: "State (e.g. CA) is required." };
  if (!stateFull) return { ok: false, error: "State full name is required." };

  const id = city ? `${state}-${slugify(city)}` : state;
  const slug = slugifyLegacy(state, stateFull, city);

  try {
    const row = await prisma.region.create({
      data: {
        id,
        tenantId: process.env.CANOPY_TENANT_ID ?? "tenant-masternet",
        state,
        stateFull,
        city,
        areaPart,
        slug,
        custom1,
        custom2,
        priority,
        zipCodes,
      },
    });
    await logAudit({
      action: "REGION_CREATE",
      entity: "Region",
      entityId: row.id,
      meta: { state, stateFull, city, slug },
    });
    revalidatePath("/admin/regions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create region." };
  }
}

export async function updateRegion(id: string, formData: FormData): Promise<ActionResult> {
  const state = String(formData.get("state") ?? "").trim().toUpperCase();
  const stateFull = String(formData.get("stateFull") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const areaPart = parseAreaPart(String(formData.get("areaPart") ?? "").trim() || null);
  const priorityRaw = Number(formData.get("priority") ?? 999);
  const priority = Number.isFinite(priorityRaw) ? priorityRaw : 999;
  const custom1 = String(formData.get("custom1") ?? "").trim() || null;
  const custom2 = String(formData.get("custom2") ?? "").trim() || null;
  const zipRaw = String(formData.get("zipCodes") ?? "").trim();
  const zipCodes = zipRaw
    .split(",")
    .map((z) => z.trim())
    .filter(Boolean);

  if (!state) return { ok: false, error: "State (e.g. CA) is required." };
  if (!stateFull) return { ok: false, error: "State full name is required." };

  const slug = slugifyLegacy(state, stateFull, city);

  try {
    const row = await prisma.region.update({
      where: { id },
      data: {
        state,
        stateFull,
        city,
        areaPart,
        slug,
        custom1,
        custom2,
        priority,
        zipCodes,
      },
    });
    await logAudit({
      action: "REGION_UPDATE",
      entity: "Region",
      entityId: row.id,
      meta: { state, stateFull, city, slug },
    });
    revalidatePath("/admin/regions");
    revalidatePath(`/admin/regions/${id}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update region." };
  }
}

export async function deleteRegion(id: string, _formData: FormData): Promise<void> {
  try {
    await prisma.region.delete({ where: { id } });
    await logAudit({
      action: "REGION_DELETE",
      entity: "Region",
      entityId: id,
    });
    revalidatePath("/admin/regions");
  } catch {
    // silently ignore — region may have relations (variants, listing regions)
  }
}

export async function createRegionForm(formData: FormData): Promise<void> {
  await createRegion(formData);
}

export async function updateRegionForm(id: string, formData: FormData): Promise<void> {
  await updateRegion(id, formData);
}

export async function deleteRegionForm(id: string, _formData: FormData): Promise<void> {
  await deleteRegion(id, _formData);
}
