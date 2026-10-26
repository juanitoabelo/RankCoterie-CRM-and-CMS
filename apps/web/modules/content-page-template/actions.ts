"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import type { ContentPageKind } from "@/lib/content-page-template/types";
import {
  listContentPageTemplates as listQuery,
  getContentPageTemplate as getQuery,
  createContentPageTemplate as createQuery,
  ensureDefaultContentPageTemplates as ensureDefaultsQuery,
  updateContentPageTemplateData as updateDataQuery,
  updateContentPageTemplateMeta as updateMetaQuery,
  setDefaultContentPageTemplate as setDefaultQuery,
  deleteContentPageTemplate as deleteQuery,
  snapshotContentPageTemplateRevision as snapshotQuery,
  listContentPageTemplateRevisions as listRevisionsQuery,
  restoreContentPageTemplateRevision as restoreQuery,
  getContentPageTemplateAssignment as getAssignmentQuery,
  assignContentPageTemplate as assignQuery,
  listContentPageSlugs,
  getContentPageSlug,
  type CpTemplateLayoutTag,
} from "./queries";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type SaveResult = ActionResult & { data?: string };
export type RestoreResult = ActionResult & { data?: string };

const SECTION_BY_KIND: Record<ContentPageKind, string> = {
  topic: "topics",
  subtopic: "templates",
};

const LIST_PATH_BY_KIND: Record<ContentPageKind, string> = {
  topic: "/admin/topic-template",
  subtopic: "/admin/subtopic-template",
};

/** Purges every public single page for the kind (both routes export revalidate = 3600). */
async function revalidatePublicPages(kind: ContentPageKind) {
  const base = kind === "topic" ? "/topic" : "/subtopic";
  const slugs = await listContentPageSlugs(kind).catch(() => []);
  for (const slug of slugs) {
    revalidatePath(`${base}/${slug}/`);
  }
}

/** Purges one public single page (assignment changes only affect that page). */
async function revalidatePublicPage(kind: ContentPageKind, pageId: string) {
  const base = kind === "topic" ? "/topic" : "/subtopic";
  const slug = await getContentPageSlug(kind, pageId).catch(() => null);
  if (slug) revalidatePath(`${base}/${slug}/`);
}

/* ── LIST ─────────────────────────────────────────────────────────────── */

export async function listContentPageTemplatesAction(kind: ContentPageKind, layout?: CpTemplateLayoutTag) {
  await requireSection(SECTION_BY_KIND[kind]);
  await ensureDefaultsQuery(kind);
  return listQuery(kind, layout);
}

/* ── GET ──────────────────────────────────────────────────────────────── */

export async function getContentPageTemplateAction(id: string) {
  const template = await getQuery(id);
  if (template) await requireSection(SECTION_BY_KIND[template.kind as ContentPageKind] ?? "topics");
  return template;
}

/* ── CREATE ───────────────────────────────────────────────────────────── */

export async function createContentPageTemplateAction(
  kind: ContentPageKind,
  name: string,
  layout: CpTemplateLayoutTag = "FULLWIDTH",
): Promise<ActionResult & { id?: string }> {
  const actor = await requireSection(SECTION_BY_KIND[kind]);
  try {
    const template = await createQuery(name, kind, { layout });
    await logAudit({
      action: "CONTENT_PAGE_TEMPLATE_CREATE",
      entity: "ContentPageTemplate",
      entityId: template.id,
      actorId: actor.id,
      reason: `Created ${kind} template: ${name} (${layout})`,
    });
    revalidatePath(LIST_PATH_BY_KIND[kind]);
    await revalidatePublicPages(kind);
    return { ok: true, id: template.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create template." };
  }
}

/* ── UPDATE DATA (autosave) ──────────────────────────────────────────── */

export async function updateContentPageTemplateBlocksAction(
  id: string,
  blocksJson: string,
  opts: { createRevision?: boolean } = {},
): Promise<SaveResult> {
  const existing = await getQuery(id);
  if (!existing) return { ok: false, error: "Template not found." };
  const kind = existing.kind as ContentPageKind;
  const actor = await requireSection(SECTION_BY_KIND[kind] ?? "topics");
  try {
    await updateDataQuery(id, blocksJson);
    if (opts.createRevision) {
      await snapshotQuery(id, blocksJson);
    }
    await logAudit({
      action: "CONTENT_PAGE_TEMPLATE_UPDATE",
      entity: "ContentPageTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(`${LIST_PATH_BY_KIND[kind]}/${id}/edit`);
    await revalidatePublicPages(kind);
    return { ok: true, data: blocksJson };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save." };
  }
}

/* ── UPDATE META ──────────────────────────────────────────────────────── */

export async function updateContentPageTemplateMetaAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const existing = await getQuery(id);
  if (!existing) return { ok: false, error: "Template not found." };
  const kind = existing.kind as ContentPageKind;
  const actor = await requireSection(SECTION_BY_KIND[kind] ?? "topics");
  const name = String(formData.get("name") ?? "").trim();
  try {
    if (name) await updateMetaQuery(id, { name });
    await logAudit({
      action: "CONTENT_PAGE_TEMPLATE_META_UPDATE",
      entity: "ContentPageTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(`${LIST_PATH_BY_KIND[kind]}/${id}/edit`);
    revalidatePath(LIST_PATH_BY_KIND[kind]);
    await revalidatePublicPages(kind);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update." };
  }
}

/* ── SET DEFAULT ──────────────────────────────────────────────────────── */

export async function setDefaultContentPageTemplateAction(id: string): Promise<ActionResult> {
  const existing = await getQuery(id);
  if (!existing) return { ok: false, error: "Template not found." };
  const kind = existing.kind as ContentPageKind;
  const actor = await requireSection(SECTION_BY_KIND[kind] ?? "topics");
  try {
    await setDefaultQuery(id);
    await logAudit({
      action: "CONTENT_PAGE_TEMPLATE_SET_DEFAULT",
      entity: "ContentPageTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(LIST_PATH_BY_KIND[kind]);
    await revalidatePublicPages(kind);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to set default." };
  }
}

/* ── DELETE ───────────────────────────────────────────────────────────── */

export async function deleteContentPageTemplateAction(id: string): Promise<ActionResult> {
  const existing = await getQuery(id);
  if (!existing) return { ok: false, error: "Template not found." };
  const kind = existing.kind as ContentPageKind;
  const actor = await requireSection(SECTION_BY_KIND[kind] ?? "topics");
  try {
    await deleteQuery(id);
    await logAudit({
      action: "CONTENT_PAGE_TEMPLATE_DELETE",
      entity: "ContentPageTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(LIST_PATH_BY_KIND[kind]);
    await revalidatePublicPages(kind);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete." };
  }
}

/* ── REVISIONS ────────────────────────────────────────────────────────── */

export async function listContentPageTemplateRevisionsAction(id: string) {
  const existing = await getQuery(id);
  if (existing) await requireSection(SECTION_BY_KIND[existing.kind as ContentPageKind] ?? "topics");
  return listRevisionsQuery(id);
}

export async function restoreContentPageTemplateRevisionAction(
  templateId: string,
  revisionId: string,
): Promise<RestoreResult> {
  const existing = await getQuery(templateId);
  if (!existing) return { ok: false, error: "Template not found." };
  const kind = existing.kind as ContentPageKind;
  const actor = await requireSection(SECTION_BY_KIND[kind] ?? "topics");
  try {
    const data = await restoreQuery(templateId, revisionId);
    if (!data) return { ok: false, error: "Revision not found." };
    await logAudit({
      action: "CONTENT_PAGE_TEMPLATE_RESTORE",
      entity: "ContentPageTemplate",
      entityId: templateId,
      actorId: actor.id,
    });
    revalidatePath(`${LIST_PATH_BY_KIND[kind]}/${templateId}/edit`);
    await revalidatePublicPages(kind);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to restore." };
  }
}

/* ── FORM ACTIONS ─────────────────────────────────────────────────────── */

export async function createContentPageTemplateForm(kind: ContentPageKind, formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const layout = String(formData.get("layout") ?? "FULLWIDTH") as CpTemplateLayoutTag;
  await createContentPageTemplateAction(kind, name, layout);
}

/* ── ASSIGNMENT (per page) ────────────────────────────────────────────── */

export async function getContentPageTemplateForPage(pageId: string) {
  const assignment = await getAssignmentQuery(pageId);
  if (!assignment) return null;
  return getQuery(assignment.contentPageTemplateId);
}

export async function assignContentPageTemplateAction(
  kind: ContentPageKind,
  pageId: string,
  templateId: string | null,
): Promise<ActionResult> {
  const actor = await requireSection(SECTION_BY_KIND[kind]);
  try {
    await assignQuery(kind, pageId, templateId);
    await logAudit({
      action: "CONTENT_PAGE_TEMPLATE_ASSIGN",
      entity: kind === "topic" ? "Category" : "ContentTemplate",
      entityId: pageId,
      actorId: actor.id,
      reason: templateId
        ? `Assigned ${kind} template ${templateId} to ${pageId}`
        : `Cleared ${kind} template assignment for ${pageId}`,
    });
    await revalidatePublicPage(kind, pageId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save assignment." };
  }
}
