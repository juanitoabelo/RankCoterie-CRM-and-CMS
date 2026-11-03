"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { sanitizeHtml } from "@/lib/style-guide";
import { TENANT_ID } from "@/modules/shared";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function actorId(): Promise<string | null> {
  const u = await requireSection("sections");
  return u.id;
}

const SECTION_SORTABLE = [
  "title",
  "slug",
  "order",
  "status",
  "updatedAt",
  "createdAt",
] as const;

export type SectionListFilter = {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  dir?: "asc" | "desc";
};

/** Paginated section list — search/sort/filter all run in the database. */
export async function listSections(filter: SectionListFilter = {}) {
  await requireSection("sections");
  const { q = "", status = "", page = 1, pageSize = 25, sort = "", dir = "asc" } = filter;

  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { heading: { contains: q, mode: "insensitive" } },
    ];
  }

  const field = (SECTION_SORTABLE as readonly string[]).includes(sort) ? sort : null;
  const orderBy: Prisma.SectionOrderByWithRelationInput[] = field
    ? ([{ [field]: dir }, { id: "asc" }] as Prisma.SectionOrderByWithRelationInput[])
    : [{ order: "asc" }, { title: "asc" }];

  // `body` is never rendered in the list — keep it out of the payload.
  const [items, total] = await Promise.all([
    prisma.section.findMany({
      where,
      orderBy,
      skip: (Math.max(1, page) - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        order: true,
        status: true,
        updatedAt: true,
        category: { select: { id: true, slug: true, title: true } },
      },
    }),
    prisma.section.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function createSection(formData: FormData): Promise<ActionResult> {
  const actor = await actorId();
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const heading = String(formData.get("heading") ?? "").trim();
  const body = sanitizeHtml(String(formData.get("body") ?? ""));
  const status = String(formData.get("status") ?? "LIVE");
  const order = Number(formData.get("order") ?? 0) || 0;

  if (!slug || !title) return { ok: false, error: "Slug and title are required." };
  try {
    const existing = await prisma.section.findFirst({ where: { tenantId: TENANT_ID, slug } });
    if (existing) return { ok: false, error: "A section with that slug already exists." };
    await prisma.section.create({
      data: { tenantId: TENANT_ID, slug, title, heading: heading || null, body: body || null, status, order },
    });
    await logAudit({ action: "SECTION_CREATE", entity: "Section", entityId: slug, actorId: actor });
    revalidatePath("/admin/sections");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create section." };
  }
}

export async function createSectionForm(formData: FormData): Promise<void> {
  await createSection(formData);
}

export async function updateSection(id: string, formData: FormData): Promise<ActionResult> {
  const actor = await actorId();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "Title is required." };

  try {
    const existing = await prisma.section.findFirst({ where: { id, tenantId: TENANT_ID } });
    if (!existing) return { ok: false, error: "Section not found." };

    // Only overwrite optional fields when the form actually supplies them, so a
    // partial save never wipes existing content.
    const has = (key: string) => formData.get(key) !== null;
    const slug =
      String(formData.get("slug") ?? "").trim() ||
      existing.slug ||
      title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const heading = has("heading") ? String(formData.get("heading") ?? "").trim() : existing.heading;
    const body = has("body") ? sanitizeHtml(String(formData.get("body") ?? "")) : existing.body;
    const status = has("status") ? String(formData.get("status") ?? "").trim() || existing.status : existing.status;
    const order = has("order") ? Number(formData.get("order") ?? 0) || 0 : existing.order;

    const clash = await prisma.section.findFirst({
      where: { tenantId: TENANT_ID, slug, NOT: { id } },
    });
    if (clash) return { ok: false, error: "A section with that slug already exists." };
    const result = await prisma.section.updateMany({
      where: { id, tenantId: TENANT_ID },
      data: { slug, title, heading: heading || null, body: body || null, status, order },
    });
    if (!result.count) return { ok: false, error: "Section not found." };
    await logAudit({ action: "SECTION_UPDATE", entity: "Section", entityId: id, actorId: actor });
    revalidatePath("/admin/sections");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update section." };
  }
}

export async function updateSectionForm(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await updateSection(id, formData);
}

export async function deleteSection(id: string): Promise<ActionResult> {
  const actor = await actorId();
  try {
    const result = await prisma.section.deleteMany({ where: { id, tenantId: TENANT_ID } });
    if (!result.count) return { ok: false, error: "Section not found." };
    await logAudit({ action: "SECTION_DELETE", entity: "Section", entityId: id, actorId: actor });
    revalidatePath("/admin/sections");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete section." };
  }
}

export async function deleteSectionForm(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await deleteSection(id);
}
