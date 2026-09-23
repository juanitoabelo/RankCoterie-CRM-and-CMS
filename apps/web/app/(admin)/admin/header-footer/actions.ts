"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import {
  listHeaderFooters as listQuery,
  getHeaderFooter as getQuery,
  createHeaderFooter as createQuery,
  updateHeaderFooterData as updateDataQuery,
  updateHeaderFooterMeta as updateMetaQuery,
  setDefaultHeaderFooter as setDefaultQuery,
  deleteHeaderFooter as deleteQuery,
  snapshotHeaderFooterRevision as snapshotQuery,
  listHeaderFooterRevisions as listRevisionsQuery,
  restoreHeaderFooterRevision as restoreQuery,
  getAssignments as getAssignmentsQuery,
  saveAssignments as saveAssignmentsQuery,
} from "@/modules/header-footer";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type SaveResult = ActionResult & { data?: string };
export type RestoreResult = ActionResult & { data?: string };

/* ── LIST ─────────────────────────────────────────────────────────────── */

export async function listHeaderFooters(type?: string) {
  await requireSection("headerFooter");
  return listQuery(type);
}

/* ── GET ──────────────────────────────────────────────────────────────── */

export async function getHeaderFooter(id: string) {
  await requireSection("headerFooter");
  return getQuery(id);
}

/* ── CREATE ───────────────────────────────────────────────────────────── */

export async function createHeaderFooterAction(
  name: string,
  type: string,
): Promise<ActionResult & { id?: string }> {
  const actor = await requireSection("headerFooter");
  try {
    const template = await createQuery(name, type);
    await logAudit({
      action: "HEADER_FOOTER_CREATE",
      entity: "HeaderFooter",
      entityId: template.id,
      actorId: actor.id,
      reason: `Created ${type}: ${name}`,
    });
    revalidatePath("/admin/header-footer");
    return { ok: true, id: template.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create template.",
    };
  }
}

/* ── UPDATE DATA (autosave) ──────────────────────────────────────────── */

export async function updateHeaderFooterBlocks(
  id: string,
  blocksJson: string,
  opts: { createRevision?: boolean } = {},
): Promise<SaveResult> {
  const actor = await requireSection("headerFooter");
  try {
    await updateDataQuery(id, blocksJson);
    if (opts.createRevision) {
      await snapshotQuery(id, blocksJson);
    }
    await logAudit({
      action: "HEADER_FOOTER_UPDATE",
      entity: "HeaderFooter",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(`/admin/header-footer/${id}/edit`);
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

export async function updateHeaderFooterMetaAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireSection("headerFooter");
  const name = String(formData.get("name") ?? "").trim();
  try {
    if (name) {
      await updateMetaQuery(id, { name });
    }
    await logAudit({
      action: "HEADER_FOOTER_META_UPDATE",
      entity: "HeaderFooter",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(`/admin/header-footer/${id}/edit`);
    revalidatePath("/admin/header-footer");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update.",
    };
  }
}

/* ── SET DEFAULT ──────────────────────────────────────────────────────── */

export async function setDefaultAction(id: string): Promise<ActionResult> {
  const actor = await requireSection("headerFooter");
  try {
    await setDefaultQuery(id);
    await logAudit({
      action: "HEADER_FOOTER_SET_DEFAULT",
      entity: "HeaderFooter",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath("/admin/header-footer");
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

export async function deleteHeaderFooterAction(id: string): Promise<ActionResult> {
  const actor = await requireSection("headerFooter");
  try {
    await deleteQuery(id);
    await logAudit({
      action: "HEADER_FOOTER_DELETE",
      entity: "HeaderFooter",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath("/admin/header-footer");
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
  await requireSection("headerFooter");
  return listRevisionsQuery(id);
}

export async function restoreRevision(
  headerFooterId: string,
  revisionId: string,
): Promise<RestoreResult> {
  const actor = await requireSection("headerFooter");
  try {
    const data = await restoreQuery(headerFooterId, revisionId);
    if (!data) return { ok: false, error: "Revision not found." };
    await logAudit({
      action: "HEADER_FOOTER_RESTORE",
      entity: "HeaderFooter",
      entityId: headerFooterId,
      actorId: actor.id,
    });
    revalidatePath(`/admin/header-footer/${headerFooterId}/edit`);
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

export async function createHeaderFooterForm(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "HEADER");
  await createHeaderFooterAction(name, type);
}

export async function deleteHeaderFooterForm(
  id: string,
  formData: FormData,
): Promise<void> {
  await deleteHeaderFooterAction(id);
}

/* ── ASSIGNMENTS ──────────────────────────────────────────────────────── */

export async function getAssignments(headerFooterId: string) {
  await requireSection("headerFooter");
  return getAssignmentsQuery(headerFooterId);
}

export async function saveAssignmentsAction(
  headerFooterId: string,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireSection("headerFooter");
  const pageIds = formData.getAll("pageId").map((v) => String(v).trim() || null);
  const pageTypes = formData.getAll("pageType").map((v) => String(v).trim() || null);
  const priorities = formData.getAll("priority").map((v) => Number(v) || 0);

  const assignments = pageIds.map((pageId, i) => ({
    pageId,
    pageType: pageTypes[i],
    priority: priorities[i] ?? i,
  }));

  try {
    await saveAssignmentsQuery(headerFooterId, assignments);
    await logAudit({
      action: "HEADER_FOOTER_ASSIGNMENTS_SAVE",
      entity: "HeaderFooter",
      entityId: headerFooterId,
      actorId: actor.id,
    });
    revalidatePath(`/admin/header-footer/${headerFooterId}/edit`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save assignments.",
    };
  }
}
