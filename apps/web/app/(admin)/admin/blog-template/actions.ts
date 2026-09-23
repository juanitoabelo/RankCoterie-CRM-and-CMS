"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import {
  listBlogTemplates as listQuery,
  getBlogTemplate as getQuery,
  createBlogTemplate as createQuery,
  updateBlogTemplateData as updateDataQuery,
  updateBlogTemplateMeta as updateMetaQuery,
  setDefaultBlogTemplate as setDefaultQuery,
  deleteBlogTemplate as deleteQuery,
  snapshotBlogTemplateRevision as snapshotQuery,
  listBlogTemplateRevisions as listRevisionsQuery,
  restoreBlogTemplateRevision as restoreQuery,
  getBlogTemplateAssignments as getAssignmentsQuery,
  saveBlogTemplateAssignments as saveAssignmentsQuery,
} from "@/modules/blog-template";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type SaveResult = ActionResult & { data?: string };
export type RestoreResult = ActionResult & { data?: string };

/* ── LIST ─────────────────────────────────────────────────────────────── */

export async function listBlogTemplates(type?: "listing" | "single") {
  await requireSection("blogTemplate");
  return listQuery(type);
}

/* ── GET ──────────────────────────────────────────────────────────────── */

export async function getBlogTemplate(id: string) {
  await requireSection("blogTemplate");
  return getQuery(id);
}

/* ── CREATE ───────────────────────────────────────────────────────────── */

export async function createBlogTemplateAction(
  name: string,
  type: "listing" | "single",
): Promise<ActionResult & { id?: string }> {
  const actor = await requireSection("blogTemplate");
  try {
    const template = await createQuery(name, type);
    await logAudit({
      action: "BLOG_TEMPLATE_CREATE",
      entity: "BlogTemplate",
      entityId: template.id,
      actorId: actor.id,
      reason: `Created blog template: ${name} (${type})`,
    });
    revalidatePath("/admin/blog-template");
    return { ok: true, id: template.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create template.",
    };
  }
}

/* ── UPDATE DATA (autosave) ──────────────────────────────────────────── */

export async function updateBlogTemplateBlocks(
  id: string,
  blocksJson: string,
  opts: { createRevision?: boolean } = {},
): Promise<SaveResult> {
  const actor = await requireSection("blogTemplate");
  try {
    await updateDataQuery(id, blocksJson);
    if (opts.createRevision) {
      await snapshotQuery(id, blocksJson);
    }
    await logAudit({
      action: "BLOG_TEMPLATE_UPDATE",
      entity: "BlogTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(`/admin/blog-template/${id}/edit`);
    revalidatePath("/");
    return { ok: true, data: blocksJson };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save.",
    };
  }
}

/* ── UPDATE META ──────────────────────────────────────────────────────── */

export async function updateBlogTemplateMetaAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireSection("blogTemplate");
  const name = String(formData.get("name") ?? "").trim();
  try {
    if (name) {
      await updateMetaQuery(id, { name });
    }
    await logAudit({
      action: "BLOG_TEMPLATE_META_UPDATE",
      entity: "BlogTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(`/admin/blog-template/${id}/edit`);
    revalidatePath("/admin/blog-template");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update.",
    };
  }
}

/* ── SET DEFAULT ──────────────────────────────────────────────────────── */

export async function setDefaultBlogTemplateAction(id: string): Promise<ActionResult> {
  const actor = await requireSection("blogTemplate");
  try {
    await setDefaultQuery(id);
    await logAudit({
      action: "BLOG_TEMPLATE_SET_DEFAULT",
      entity: "BlogTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath("/admin/blog-template");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to set default.",
    };
  }
}

/* ── DELETE ───────────────────────────────────────────────────────────── */

export async function deleteBlogTemplateAction(id: string): Promise<ActionResult> {
  const actor = await requireSection("blogTemplate");
  try {
    await deleteQuery(id);
    await logAudit({
      action: "BLOG_TEMPLATE_DELETE",
      entity: "BlogTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath("/admin/blog-template");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete.",
    };
  }
}

/* ── REVISIONS ────────────────────────────────────────────────────────── */

export async function listRevisions(id: string) {
  await requireSection("blogTemplate");
  return listRevisionsQuery(id);
}

export async function restoreRevision(
  blogTemplateId: string,
  revisionId: string,
): Promise<RestoreResult> {
  const actor = await requireSection("blogTemplate");
  try {
    const data = await restoreQuery(blogTemplateId, revisionId);
    if (!data) return { ok: false, error: "Revision not found." };
    await logAudit({
      action: "BLOG_TEMPLATE_RESTORE",
      entity: "BlogTemplate",
      entityId: blogTemplateId,
      actorId: actor.id,
    });
    revalidatePath(`/admin/blog-template/${blogTemplateId}/edit`);
    revalidatePath("/");
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to restore.",
    };
  }
}

/* ── FORM ACTIONS ─────────────────────────────────────────────────────── */

export async function createBlogTemplateForm(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "listing") as "listing" | "single";
  await createBlogTemplateAction(name, type);
}

export async function deleteBlogTemplateForm(
  id: string,
  _formData: FormData,
): Promise<void> {
  await deleteBlogTemplateAction(id);
}

/* ── ASSIGNMENTS ──────────────────────────────────────────────────────── */

export async function getAssignments(blogTemplateId: string) {
  await requireSection("blogTemplate");
  return getAssignmentsQuery(blogTemplateId);
}

export async function saveAssignmentsAction(
  blogTemplateId: string,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireSection("blogTemplate");
  const pageIds = formData.getAll("pageId").map((v) => String(v).trim() || null);
  const pageTypes = formData.getAll("pageType").map((v) => String(v).trim() || null);
  const priorities = formData.getAll("priority").map((v) => Number(v) || 0);

  const assignments = pageIds.map((pageId, i) => ({
    pageId,
    pageType: pageTypes[i],
    priority: priorities[i] ?? i,
  }));

  try {
    await saveAssignmentsQuery(blogTemplateId, assignments);
    await logAudit({
      action: "BLOG_TEMPLATE_ASSIGNMENTS_SAVE",
      entity: "BlogTemplate",
      entityId: blogTemplateId,
      actorId: actor.id,
    });
    revalidatePath(`/admin/blog-template/${blogTemplateId}/edit`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save assignments.",
    };
  }
}
