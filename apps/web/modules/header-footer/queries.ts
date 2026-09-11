/**
 * Header / Footer Builder — Module Queries
 */
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";
import type { ContainerSettings } from "@/lib/header-footer/types";
import { DEFAULT_CONTAINER_SETTINGS } from "@/lib/header-footer/types";

export interface HeaderFooterData {
  blocks: import("@/lib/page-builder/types").Block[];
  containerSettings: ContainerSettings;
}

export interface HeaderFooterRow {
  id: string;
  name: string;
  type: string;
  data: string | null;
  isDefault: boolean;
  updatedAt: Date;
  createdAt: Date;
}

export interface HeaderFooterRevisionRow {
  id: string;
  headerFooterId: string;
  data: string;
  createdAt: Date;
}

export interface AssignmentRow {
  id: string;
  headerFooterId: string;
  priority: number;
  pageId: string | null;
  pageType: string | null;
  createdAt: Date;
}

/** Parse template data JSON into blocks and container settings. */
export function parseHeaderFooterData(data: string | null): HeaderFooterData {
  if (!data) {
    return { blocks: [], containerSettings: DEFAULT_CONTAINER_SETTINGS };
  }
  try {
    const parsed = JSON.parse(data);
    // Support both old format (just blocks array) and new format (with containerSettings)
    if (Array.isArray(parsed)) {
      return { blocks: parsed, containerSettings: DEFAULT_CONTAINER_SETTINGS };
    }
    return {
      blocks: parsed.blocks ?? [],
      containerSettings: { ...DEFAULT_CONTAINER_SETTINGS, ...parsed.containerSettings },
    };
  } catch {
    return { blocks: [], containerSettings: DEFAULT_CONTAINER_SETTINGS };
  }
}

/** Serialize blocks and container settings to JSON string. */
export function serializeHeaderFooterData(
  blocks: import("@/lib/page-builder/types").Block[],
  containerSettings: ContainerSettings,
): string {
  return JSON.stringify({ blocks, containerSettings });
}

/** List all header/footer templates for the current tenant. */
export async function listHeaderFooters(type?: string): Promise<HeaderFooterRow[]> {
  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  if (type) where.type = type;
  return prisma.headerFooter.findMany({
    where,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  }) as Promise<HeaderFooterRow[]>;
}

/** Get a single header/footer template by ID. */
export async function getHeaderFooter(id: string): Promise<HeaderFooterRow | null> {
  return prisma.headerFooter.findUnique({ where: { id } }) as Promise<HeaderFooterRow | null>;
}

/** Create a new header/footer template. */
export async function createHeaderFooter(
  name: string,
  type: string,
  data?: string,
): Promise<HeaderFooterRow> {
  return prisma.headerFooter.create({
    data: {
      tenantId: TENANT_ID,
      name,
      type,
      data: data ?? "[]",
    },
  }) as Promise<HeaderFooterRow>;
}

/** Update header/footer template blocks data. */
export async function updateHeaderFooterData(
  id: string,
  data: string,
): Promise<void> {
  await prisma.headerFooter.update({
    where: { id },
    data: { data },
  });
}

/** Update header/footer template metadata (name, isDefault). */
export async function updateHeaderFooterMeta(
  id: string,
  patch: { name?: string; isDefault?: boolean },
): Promise<void> {
  await prisma.headerFooter.update({
    where: { id },
    data: patch,
  });
}

/** Set a template as the default for its type, clearing other defaults. */
export async function setDefaultHeaderFooter(id: string): Promise<void> {
  const template = await prisma.headerFooter.findUnique({ where: { id } });
  if (!template) return;
  await prisma.$transaction([
    prisma.headerFooter.updateMany({
      where: { tenantId: TENANT_ID, type: template.type, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.headerFooter.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);
}

/** Delete a header/footer template. */
export async function deleteHeaderFooter(id: string): Promise<void> {
  await prisma.headerFooter.delete({ where: { id } });
}

/** Snapshot a revision. */
export async function snapshotHeaderFooterRevision(
  headerFooterId: string,
  data: string,
): Promise<void> {
  await prisma.headerFooterRevision.create({
    data: { headerFooterId, data },
  });
  // Keep max 30 revisions
  const revisions = await prisma.headerFooterRevision.findMany({
    where: { headerFooterId },
    orderBy: { createdAt: "desc" },
    skip: 30,
  });
  if (revisions.length > 0) {
    await prisma.headerFooterRevision.deleteMany({
      where: { id: { in: revisions.map((r) => r.id) } },
    });
  }
}

/** List revisions for a template. */
export async function listHeaderFooterRevisions(
  headerFooterId: string,
): Promise<HeaderFooterRevisionRow[]> {
  return prisma.headerFooterRevision.findMany({
    where: { headerFooterId },
    orderBy: { createdAt: "desc" },
    take: 30,
  }) as Promise<HeaderFooterRevisionRow[]>;
}

/** Restore a revision. */
export async function restoreHeaderFooterRevision(
  headerFooterId: string,
  revisionId: string,
): Promise<string | null> {
  const revision = await prisma.headerFooterRevision.findUnique({
    where: { id: revisionId },
  });
  if (!revision || revision.headerFooterId !== headerFooterId) return null;
  await prisma.headerFooter.update({
    where: { id: headerFooterId },
    data: { data: revision.data },
  });
  await snapshotHeaderFooterRevision(headerFooterId, revision.data);
  return revision.data;
}

/** Resolve which header/footer template to use for a given context. */
export async function resolveHeaderFooter(
  type: "HEADER" | "FOOTER",
  context: { pageId?: string; pageType?: string } = {},
): Promise<HeaderFooterRow | null> {
  // 1. Check per-page assignment
  if (context.pageId) {
    const pageAssignment = await prisma.headerFooterAssignment.findFirst({
      where: {
        tenantId: TENANT_ID,
        headerFooter: { type },
        pageId: context.pageId,
      },
      include: { headerFooter: true },
      orderBy: { priority: "desc" },
    });
    if (pageAssignment) {
      return pageAssignment.headerFooter as HeaderFooterRow;
    }
  }

  // 2. Check per-page-type assignment
  if (context.pageType) {
    const typeAssignment = await prisma.headerFooterAssignment.findFirst({
      where: {
        tenantId: TENANT_ID,
        headerFooter: { type },
        pageType: context.pageType,
      },
      include: { headerFooter: true },
      orderBy: { priority: "desc" },
    });
    if (typeAssignment) {
      return typeAssignment.headerFooter as HeaderFooterRow;
    }
  }

  // 3. Fall back to global default
  const defaultTemplate = await prisma.headerFooter.findFirst({
    where: { tenantId: TENANT_ID, type, isDefault: true },
  });
  return defaultTemplate as HeaderFooterRow | null;
}

/** Get all assignments for a template. */
export async function getAssignments(headerFooterId: string): Promise<AssignmentRow[]> {
  return prisma.headerFooterAssignment.findMany({
    where: { headerFooterId },
    orderBy: { priority: "desc" },
  }) as Promise<AssignmentRow[]>;
}

/** Save assignments for a template (replaces all existing). */
export async function saveAssignments(
  headerFooterId: string,
  assignments: Array<{
    pageId?: string | null;
    pageType?: string | null;
    priority?: number;
  }>,
): Promise<void> {
  await prisma.$transaction([
    prisma.headerFooterAssignment.deleteMany({
      where: { headerFooterId },
    }),
    ...assignments.map((a, i) =>
      prisma.headerFooterAssignment.create({
        data: {
          tenantId: TENANT_ID,
          headerFooterId,
          pageId: a.pageId || null,
          pageType: a.pageType || null,
          priority: a.priority ?? i,
        },
      }),
    ),
  ]);
}
