"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/lib/tenant";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createPage(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "DRAFT").trim();

  if (!name) return { ok: false, error: "Name is required." };
  if (!slug) return { ok: false, error: "Slug is required." };

  try {
    const row = await prisma.page.create({
      data: {
        tenantId: TENANT_ID,
        name,
        slug,
        title: title || name,
        status,
        data: "[]",
      },
    });
    await logAudit({
      action: "PAGE_CREATE",
      entity: "Page",
      entityId: row.id,
      meta: { name, slug },
    });
    revalidatePath("/admin/pages");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create page." };
  }
}

export async function updatePageBlocks(
  pageId: string,
  blocksJson: string,
  opts: { createRevision?: boolean } = {},
): Promise<ActionResult> {
  try {
    await prisma.page.update({
      where: { id: pageId },
      data: { data: blocksJson },
    });
    if (opts.createRevision) {
      await snapshotPageRevision(pageId, blocksJson);
    }
    await logAudit({
      action: "PAGE_UPDATE",
      entity: "Page",
      entityId: pageId,
    });
    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${pageId}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save blocks." };
  }
}

const MAX_REVISIONS = 30;

async function snapshotPageRevision(pageId: string, data: string): Promise<void> {
  await prisma.pageRevision.create({ data: { pageId, data } });
  const latest = await prisma.pageRevision.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
    take: MAX_REVISIONS + 1,
  });
  const excess = latest.slice(MAX_REVISIONS).map((r) => r.id);
  if (excess.length > 0) {
    await prisma.pageRevision.deleteMany({ where: { id: { in: excess } } });
  }
}

export interface PageRevisionRow {
  id: string;
  createdAt: Date;
}

export async function listPageRevisions(pageId: string): Promise<PageRevisionRow[]> {
  return prisma.pageRevision.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
    take: MAX_REVISIONS,
  });
}

export async function restorePageRevision(
  pageId: string,
  revisionId: string,
): Promise<ActionResult & { data?: string }> {
  const revision = await prisma.pageRevision.findFirst({
    where: { id: revisionId, pageId },
  });
  if (!revision) return { ok: false, error: "Revision not found." };
  try {
    await prisma.page.update({
      where: { id: pageId },
      data: { data: revision.data },
    });
    await snapshotPageRevision(pageId, revision.data);
    await logAudit({
      action: "PAGE_RESTORE",
      entity: "Page",
      entityId: pageId,
      meta: { revisionId },
    });
    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${pageId}/edit`);
    return { ok: true, data: revision.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to restore revision." };
  }
}

const PAGE_STATUSES = ["DRAFT", "LIVE", "DISABLED"];

export async function setPageStatus(pageId: string, status: string): Promise<ActionResult> {
  if (!PAGE_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }
  try {
    await prisma.page.update({ where: { id: pageId }, data: { status } });
    await logAudit({
      action: "PAGE_STATUS",
      entity: "Page",
      entityId: pageId,
      meta: { status },
    });
    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${pageId}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update status." };
  }
}

export async function updatePageMeta(
  pageId: string,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "DRAFT").trim();

  if (!name) return { ok: false, error: "Name is required." };
  if (!slug) return { ok: false, error: "Slug is required." };

  try {
    await prisma.page.update({
      where: { id: pageId },
      data: { name, slug, title: title || name, status },
    });
    await logAudit({
      action: "PAGE_UPDATE",
      entity: "Page",
      entityId: pageId,
      meta: { name, slug },
    });
    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${pageId}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update page." };
  }
}

export async function deletePage(id: string, _formData: FormData): Promise<void> {
  try {
    await prisma.page.delete({ where: { id } });
    await logAudit({
      action: "PAGE_DELETE",
      entity: "Page",
      entityId: id,
    });
    revalidatePath("/admin/pages");
  } catch {
    // silently ignore
  }
}

export async function createPageForm(formData: FormData): Promise<void> {
  await createPage(formData);
}

export async function deletePageForm(id: string, _formData: FormData): Promise<void> {
  await deletePage(id, _formData);
}
