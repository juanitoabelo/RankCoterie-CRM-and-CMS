"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import {
  listPageLayouts as listQuery,
  getPageLayout as getQuery,
  createPageLayout as createQuery,
  updatePageLayoutData as updateDataQuery,
  updatePageLayoutMeta as updateMetaQuery,
  setDefaultPageLayout as setDefaultQuery,
  deletePageLayout as deleteQuery,
  snapshotPageLayoutRevision as snapshotQuery,
  listPageLayoutRevisions as listRevisionsQuery,
  restorePageLayoutRevision as restoreQuery,
  getPageLayoutAssignments as getAssignmentsQuery,
  savePageLayoutAssignments as saveAssignmentsQuery,
} from "@/modules/page-layout";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type SaveResult = ActionResult & { data?: string };
export type RestoreResult = ActionResult & { data?: string };

/* ── LIST ─────────────────────────────────────────────────────────────── */

export async function listPageLayouts() {
  await requireSection("pageLayout");
  return listQuery();
}

/* ── GET ──────────────────────────────────────────────────────────────── */

export async function getPageLayout(id: string) {
  await requireSection("pageLayout");
  return getQuery(id);
}

/* ── CREATE ───────────────────────────────────────────────────────────── */

export async function createPageLayoutAction(
  name: string,
): Promise<ActionResult & { id?: string }> {
  const actor = await requireSection("pageLayout");
  try {
    const template = await createQuery(name);
    await logAudit({
      action: "PAGE_LAYOUT_CREATE",
      entity: "PageLayout",
      entityId: template.id,
      actorId: actor.id,
      reason: `Created page layout: ${name}`,
    });
    revalidatePath("/admin/page-layout");
    return { ok: true, id: template.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create template.",
    };
  }
}

/* ── UPDATE DATA (autosave) ──────────────────────────────────────────── */

export async function updatePageLayoutBlocks(
  id: string,
  blocksJson: string,
  opts: { createRevision?: boolean } = {},
): Promise<SaveResult> {
  const actor = await requireSection("pageLayout");
  try {
    await updateDataQuery(id, blocksJson);
    if (opts.createRevision) {
      await snapshotQuery(id, blocksJson);
    }
    await logAudit({
      action: "PAGE_LAYOUT_UPDATE",
      entity: "PageLayout",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(`/admin/page-layout/${id}/edit`);
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

export async function updatePageLayoutMetaAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireSection("pageLayout");
  const name = String(formData.get("name") ?? "").trim();
  try {
    if (name) {
      await updateMetaQuery(id, { name });
    }
    await logAudit({
      action: "PAGE_LAYOUT_META_UPDATE",
      entity: "PageLayout",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(`/admin/page-layout/${id}/edit`);
    revalidatePath("/admin/page-layout");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update.",
    };
  }
}

/* ── SET DEFAULT ──────────────────────────────────────────────────────── */

export async function setDefaultPageLayoutAction(id: string): Promise<ActionResult> {
  const actor = await requireSection("pageLayout");
  try {
    await setDefaultQuery(id);
    await logAudit({
      action: "PAGE_LAYOUT_SET_DEFAULT",
      entity: "PageLayout",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath("/admin/page-layout");
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

export async function deletePageLayoutAction(id: string): Promise<ActionResult> {
  const actor = await requireSection("pageLayout");
  try {
    await deleteQuery(id);
    await logAudit({
      action: "PAGE_LAYOUT_DELETE",
      entity: "PageLayout",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath("/admin/page-layout");
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
  await requireSection("pageLayout");
  return listRevisionsQuery(id);
}

export async function restoreRevision(
  pageLayoutId: string,
  revisionId: string,
): Promise<RestoreResult> {
  const actor = await requireSection("pageLayout");
  try {
    const data = await restoreQuery(pageLayoutId, revisionId);
    if (!data) return { ok: false, error: "Revision not found." };
    await logAudit({
      action: "PAGE_LAYOUT_RESTORE",
      entity: "PageLayout",
      entityId: pageLayoutId,
      actorId: actor.id,
    });
    revalidatePath(`/admin/page-layout/${pageLayoutId}/edit`);
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

export async function createPageLayoutForm(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  await createPageLayoutAction(name);
}

export async function deletePageLayoutForm(
  id: string,
  _formData: FormData,
): Promise<void> {
  await deletePageLayoutAction(id);
}

/* ── ASSIGNMENTS ──────────────────────────────────────────────────────── */

export async function getAssignments(pageLayoutId: string) {
  await requireSection("pageLayout");
  return getAssignmentsQuery(pageLayoutId);
}

export async function saveAssignmentsAction(
  pageLayoutId: string,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireSection("pageLayout");
  const pageIds = formData.getAll("pageId").map((v) => String(v).trim() || null);
  const pageTypes = formData.getAll("pageType").map((v) => String(v).trim() || null);
  const priorities = formData.getAll("priority").map((v) => Number(v) || 0);

  const assignments = pageIds.map((pageId, i) => ({
    pageId,
    pageType: pageTypes[i],
    priority: priorities[i] ?? i,
  }));

  try {
    await saveAssignmentsQuery(pageLayoutId, assignments);
    await logAudit({
      action: "PAGE_LAYOUT_ASSIGNMENTS_SAVE",
      entity: "PageLayout",
      entityId: pageLayoutId,
      actorId: actor.id,
    });
    revalidatePath(`/admin/page-layout/${pageLayoutId}/edit`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save assignments.",
    };
  }
}
