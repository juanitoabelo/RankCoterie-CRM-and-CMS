"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import {
  listGeoCategoryTemplates as listQuery,
  getGeoCategoryTemplate as getQuery,
  createGeoCategoryTemplate as createQuery,
  ensureDefaultGeoCategoryTemplates as ensureDefaultsQuery,
  updateGeoCategoryTemplateData as updateDataQuery,
  updateGeoCategoryTemplateMeta as updateMetaQuery,
  setDefaultGeoCategoryTemplate as setDefaultQuery,
  deleteGeoCategoryTemplate as deleteQuery,
  snapshotGeoCategoryTemplateRevision as snapshotQuery,
  listGeoCategoryTemplateRevisions as listRevisionsQuery,
  restoreGeoCategoryTemplateRevision as restoreQuery,
  getGeoCategoryTemplateAssignment as getAssignmentQuery,
  assignGeoCategoryTemplate as assignQuery,
  type GeoTemplateLayoutTag,
} from "@/modules/geo-category-template";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type SaveResult = ActionResult & { data?: string };
export type RestoreResult = ActionResult & { data?: string };

const LIST_PATH = "/admin/geo-category-template";

/** Purges every public /g/[category] page (they export revalidate = 3600).
 *  revalidatePath("/g") would only hit the literal /g path — not the route.
 *  Region + paginated region routes render the same template, so they purge too. */
function revalidateGeoPages() {
  revalidatePath("/g/[category]", "page");
  revalidatePath("/g/[category]/[region]", "page");
  revalidatePath("/g/[category]/[region]/page/[pageNum]", "page");
}

/* ── LIST ─────────────────────────────────────────────────────────────── */

export async function listGeoCategoryTemplates(layout?: GeoTemplateLayoutTag) {
  await requireSection("categories");
  await ensureDefaultsQuery();
  return listQuery(layout);
}

/* ── GET ──────────────────────────────────────────────────────────────── */

export async function getGeoCategoryTemplate(id: string) {
  await requireSection("categories");
  return getQuery(id);
}

/* ── CREATE ───────────────────────────────────────────────────────────── */

export async function createGeoCategoryTemplateAction(
  name: string,
  layout: GeoTemplateLayoutTag = "FULLWIDTH",
): Promise<ActionResult & { id?: string }> {
  const actor = await requireSection("categories");
  try {
    const template = await createQuery(name, { layout });
    await logAudit({
      action: "GEO_CATEGORY_TEMPLATE_CREATE",
      entity: "GeoCategoryTemplate",
      entityId: template.id,
      actorId: actor.id,
      reason: `Created geo category template: ${name} (${layout})`,
    });
    revalidatePath(LIST_PATH);
    revalidateGeoPages();
    return { ok: true, id: template.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create template.",
    };
  }
}

/* ── UPDATE DATA (autosave) ──────────────────────────────────────────── */

export async function updateGeoCategoryTemplateBlocks(
  id: string,
  blocksJson: string,
  opts: { createRevision?: boolean } = {},
): Promise<SaveResult> {
  const actor = await requireSection("categories");
  try {
    await updateDataQuery(id, blocksJson);
    if (opts.createRevision) {
      await snapshotQuery(id, blocksJson);
    }
    await logAudit({
      action: "GEO_CATEGORY_TEMPLATE_UPDATE",
      entity: "GeoCategoryTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(`${LIST_PATH}/${id}/edit`);
    revalidateGeoPages();
    return { ok: true, data: blocksJson };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save.",
    };
  }
}

/* ── UPDATE META ──────────────────────────────────────────────────────── */

export async function updateGeoCategoryTemplateMetaAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireSection("categories");
  const name = String(formData.get("name") ?? "").trim();
  try {
    if (name) {
      await updateMetaQuery(id, { name });
    }
    await logAudit({
      action: "GEO_CATEGORY_TEMPLATE_META_UPDATE",
      entity: "GeoCategoryTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(`${LIST_PATH}/${id}/edit`);
    revalidatePath(LIST_PATH);
    revalidateGeoPages();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update.",
    };
  }
}

/* ── SET DEFAULT ──────────────────────────────────────────────────────── */

export async function setDefaultGeoCategoryTemplateAction(id: string): Promise<ActionResult> {
  const actor = await requireSection("categories");
  try {
    await setDefaultQuery(id);
    await logAudit({
      action: "GEO_CATEGORY_TEMPLATE_SET_DEFAULT",
      entity: "GeoCategoryTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(LIST_PATH);
    revalidateGeoPages();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to set default.",
    };
  }
}

/* ── DELETE ───────────────────────────────────────────────────────────── */

export async function deleteGeoCategoryTemplateAction(id: string): Promise<ActionResult> {
  const actor = await requireSection("categories");
  try {
    await deleteQuery(id);
    await logAudit({
      action: "GEO_CATEGORY_TEMPLATE_DELETE",
      entity: "GeoCategoryTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(LIST_PATH);
    revalidateGeoPages();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete.",
    };
  }
}

/* ── REVISIONS ────────────────────────────────────────────────────────── */

export async function listGeoCategoryTemplateRevisions(id: string) {
  await requireSection("categories");
  return listRevisionsQuery(id);
}

export async function restoreGeoCategoryTemplateRevisionAction(
  geoCategoryTemplateId: string,
  revisionId: string,
): Promise<RestoreResult> {
  const actor = await requireSection("categories");
  try {
    const data = await restoreQuery(geoCategoryTemplateId, revisionId);
    if (!data) return { ok: false, error: "Revision not found." };
    await logAudit({
      action: "GEO_CATEGORY_TEMPLATE_RESTORE",
      entity: "GeoCategoryTemplate",
      entityId: geoCategoryTemplateId,
      actorId: actor.id,
    });
    revalidatePath(`${LIST_PATH}/${geoCategoryTemplateId}/edit`);
    revalidateGeoPages();
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to restore.",
    };
  }
}

/* ── FORM ACTIONS ─────────────────────────────────────────────────────── */

export async function createGeoCategoryTemplateForm(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const layout = String(formData.get("layout") ?? "FULLWIDTH") as GeoTemplateLayoutTag;
  await createGeoCategoryTemplateAction(name, layout);
}

export async function deleteGeoCategoryTemplateForm(id: string, _formData: FormData): Promise<void> {
  await deleteGeoCategoryTemplateAction(id);
}

/* ── ASSIGNMENT (per GeoCategory page) ────────────────────────────────── */

export async function getGeoCategoryTemplateForCategory(categoryId: string) {
  await requireSection("categories");
  const assignment = await getAssignmentQuery(categoryId);
  if (!assignment) return null;
  const template = await getQuery(assignment.geoCategoryTemplateId);
  return template;
}

export async function assignGeoCategoryTemplateAction(
  categoryId: string,
  templateId: string | null,
): Promise<ActionResult> {
  const actor = await requireSection("categories");
  try {
    await assignQuery(categoryId, templateId);
    await logAudit({
      action: "GEO_CATEGORY_TEMPLATE_ASSIGN",
      entity: "Category",
      entityId: categoryId,
      actorId: actor.id,
      reason: templateId
        ? `Assigned geo template ${templateId} to category ${categoryId}`
        : `Cleared geo template assignment for category ${categoryId}`,
    });
    revalidatePath(`/admin/geo-categories/${categoryId}/edit`);
    revalidateGeoPages();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save assignment.",
    };
  }
}
