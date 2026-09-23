"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/modules/shared";
import { sanitizeHtml } from "@/lib/style-guide";
import { AREA_PARTS, US_STATES } from "./constants";
import { requireSection } from "@/modules/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

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
  await requireSection("regions");
  const state = String(formData.get("state") ?? "").trim().toUpperCase();
  const city = String(formData.get("city") ?? "").trim() || null;
  const custom1 = String(formData.get("custom1") ?? "").trim() || null;
  const custom2 = String(formData.get("custom2") ?? "").trim() || null;

  if (!state) return { ok: false, error: "State is required." };
  if (!US_STATES[state]) return { ok: false, error: `Invalid state code: ${state}` };

  const stateFull = US_STATES[state];
  const id = city ? `${state}-${slugify(city)}` : state;
  const slug = slugifyLegacy(state, stateFull, city);

  try {
    const existing = await prisma.region.findFirst({ where: { tenantId: TENANT_ID, slug } });
    if (existing) return { ok: false, error: "A region with that slug already exists." };

    const row = await prisma.region.create({
      data: {
        id,
        tenantId: TENANT_ID,
        state,
        stateFull,
        city,
        slug,
        custom1: custom1 ? sanitizeHtml(custom1) : null,
        custom2: custom2 ? sanitizeHtml(custom2) : null,
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
  await requireSection("regions");
  const state = String(formData.get("state") ?? "").trim().toUpperCase();
  const city = String(formData.get("city") ?? "").trim() || null;
  const areaPart = parseAreaPart(String(formData.get("areaPart") ?? "").trim() || null);
  const custom1 = String(formData.get("custom1") ?? "").trim() || null;
  const custom2 = String(formData.get("custom2") ?? "").trim() || null;

  if (!state) return { ok: false, error: "State is required." };
  if (!US_STATES[state]) return { ok: false, error: `Invalid state code: ${state}` };

  const stateFull = US_STATES[state];
  const slug = slugifyLegacy(state, stateFull, city);

  try {
    await prisma.region.update({
      where: { id },
      data: {
        state,
        stateFull,
        city,
        areaPart,
        slug,
        custom1: custom1 ? sanitizeHtml(custom1) : null,
        custom2: custom2 ? sanitizeHtml(custom2) : null,
      },
    });
    await logAudit({
      action: "REGION_UPDATE",
      entity: "Region",
      entityId: id,
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
  await requireSection("regions");
  try {
    await prisma.region.delete({ where: { id } });
    await logAudit({ action: "REGION_DELETE", entity: "Region", entityId: id });
    revalidatePath("/admin/regions");
  } catch {
    // silently ignore — region may have relations
  }
}

export async function getRegion(id: string) {
  await requireSection("regions");
  return prisma.region.findUnique({ where: { id } });
}
