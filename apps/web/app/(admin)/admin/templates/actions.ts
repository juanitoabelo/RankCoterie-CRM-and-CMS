"use server";

import { revalidatePath } from "next/cache";
import { ContentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { sanitizeHtml } from "@/lib/style-guide";
import { TENANT_ID } from "@/modules/shared";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function listSubTopics() {
  await requireSection("templates");
  return prisma.contentTemplate.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: [{ title: "asc" }],
    include: {
      category: { select: { id: true, title: true, slug: true } },
      featuredImage: { select: { id: true } },
    },
  });
}

export async function getSubTopic(id: string) {
  await requireSection("templates");
  return prisma.contentTemplate.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: {
      category: { select: { id: true, title: true, slug: true } },
      featuredImage: { select: { id: true } },
      sectionLinks: {
        include: { section: { select: { id: true, title: true, slug: true, order: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function getTopicOptions() {
  await requireSection("templates");
  return prisma.category.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });
}

export async function getSectionOptions() {
  await requireSection("templates");
  return prisma.section.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });
}

export async function createSubTopic(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("templates");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const author = String(formData.get("author") ?? "").trim() || null;
  const slug = String(formData.get("slug") ?? "").trim()
    || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (!title) return { ok: false, error: "Title is required." };

  try {
    const existing = await prisma.contentTemplate.findFirst({ where: { tenantId: TENANT_ID, slug } });
    if (existing) return { ok: false, error: "A subtopic with that slug already exists." };

    await prisma.contentTemplate.create({
      data: {
        tenantId: TENANT_ID,
        title,
        slug,
        body: body ? sanitizeHtml(body) : "",
        categoryId: categoryId || undefined,
        author,
        displaySections: JSON.stringify([false, false, false, false, false]),
        status: "DRAFT",
      },
    });
    await logAudit({ action: "TEMPLATE_CREATE", entity: "ContentTemplate", entityId: slug, meta: { slug, title }, actorId: actor.id });
    revalidatePath("/admin/templates");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create subtopic." };
  }
}

export async function updateSubTopic(id: string, formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("templates");
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const author = String(formData.get("author") ?? "").trim() || null;
  const featuredImageAssetId = String(formData.get("featuredImageAssetId") ?? "").trim() || null;
  const displaySectionsRaw = String(formData.get("displaySections") ?? "[]").trim();

  if (!title) return { ok: false, error: "Title is required." };
  if (!slug) return { ok: false, error: "Slug is required." };

  let displaySections: (string | boolean)[];
  try {
    displaySections = JSON.parse(displaySectionsRaw);
  } catch {
    displaySections = [false, false, false, false, false];
  }

  try {
    const clash = await prisma.contentTemplate.findFirst({
      where: { tenantId: TENANT_ID, slug, NOT: { id } },
    });
    if (clash) return { ok: false, error: "A subtopic with that slug already exists." };

    await prisma.contentTemplate.update({
      where: { id },
      data: {
        title,
        slug,
        body: body ? sanitizeHtml(body) : "",
        categoryId: categoryId || null,
        author,
        featuredImageAssetId: featuredImageAssetId || null,
        displaySections: displaySections as unknown as Prisma.InputJsonValue,
      },
    });

    await logAudit({ action: "TEMPLATE_UPDATE", entity: "ContentTemplate", entityId: id, meta: { slug, title }, actorId: actor.id });
    revalidatePath("/admin/templates");
    revalidatePath(`/admin/templates/${id}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update subtopic." };
  }
}

export async function updateSubTopicSections(id: string, sectionIds: string[]): Promise<ActionResult> {
  const actor = await requireSection("templates");
  try {
    // Remove existing links
    await prisma.subTopicSection.deleteMany({ where: { templateId: id } });
    // Create new links
    if (sectionIds.length > 0) {
      await prisma.subTopicSection.createMany({
        data: sectionIds.map((sectionId, i) => ({
          templateId: id,
          sectionId,
          order: i,
        })),
      });
    }
    await logAudit({ action: "TEMPLATE_UPDATE", entity: "ContentTemplate", entityId: id, meta: { field: "sectionLinks" }, actorId: actor.id });
    revalidatePath(`/admin/templates/${id}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save sections." };
  }
}

export async function deleteSubTopic(id: string): Promise<void> {
  await requireSection("templates");
  try {
    await prisma.subTopicSection.deleteMany({ where: { templateId: id } });
    await prisma.contentVariant.deleteMany({ where: { templateId: id } });
    await prisma.contentTemplate.delete({ where: { id } });
    await logAudit({ action: "TEMPLATE_DELETE", entity: "ContentTemplate", entityId: id });
    revalidatePath("/admin/templates");
  } catch { /* silently ignore */ }
}
