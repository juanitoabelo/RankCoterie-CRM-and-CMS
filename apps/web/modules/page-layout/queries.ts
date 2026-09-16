/**
 * Page Layout Builder — Module Queries
 */
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";
import type { ContainerSettings } from "@/lib/page-layout/types";
import { DEFAULT_CONTAINER_SETTINGS } from "@/lib/page-layout/types";

export interface PageLayoutData {
  blocks: import("@/lib/page-builder/types").Block[];
  containerSettings: ContainerSettings;
}

export interface PageLayoutRow {
  id: string;
  name: string;
  data: string | null;
  isDefault: boolean;
  updatedAt: Date;
  createdAt: Date;
}

export interface PageLayoutRevisionRow {
  id: string;
  pageLayoutId: string;
  data: string;
  createdAt: Date;
}

export interface PageLayoutAssignmentRow {
  id: string;
  pageLayoutId: string;
  priority: number;
  pageId: string | null;
  pageType: string | null;
  createdAt: Date;
}

/** Parse layout data JSON into blocks and container settings. */
export function parsePageLayoutData(data: string | null): PageLayoutData {
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
export function serializePageLayoutData(
  blocks: import("@/lib/page-builder/types").Block[],
  containerSettings: ContainerSettings,
): string {
  return JSON.stringify({ blocks, containerSettings });
}

/** List all page layout templates for the current tenant. */
export async function listPageLayouts(): Promise<PageLayoutRow[]> {
  return prisma.pageLayout.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  }) as Promise<PageLayoutRow[]>;
}

/** Get a single page layout template by ID. */
export async function getPageLayout(id: string): Promise<PageLayoutRow | null> {
  return prisma.pageLayout.findUnique({ where: { id } }) as Promise<PageLayoutRow | null>;
}

/** Create a new page layout template. */
export async function createPageLayout(
  name: string,
  data?: string,
): Promise<PageLayoutRow> {
  return prisma.pageLayout.create({
    data: {
      tenantId: TENANT_ID,
      name,
      data: data ?? "[]",
    },
  }) as Promise<PageLayoutRow>;
}

/** Update page layout template blocks data. */
export async function updatePageLayoutData(
  id: string,
  data: string,
): Promise<void> {
  await prisma.pageLayout.update({
    where: { id },
    data: { data },
  });
}

/** Update page layout template metadata (name, isDefault). */
export async function updatePageLayoutMeta(
  id: string,
  patch: { name?: string; isDefault?: boolean },
): Promise<void> {
  await prisma.pageLayout.update({
    where: { id },
    data: patch,
  });
}

/** Set a template as the default, clearing other defaults. */
export async function setDefaultPageLayout(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.pageLayout.updateMany({
      where: { tenantId: TENANT_ID, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.pageLayout.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);
}

/** Delete a page layout template. */
export async function deletePageLayout(id: string): Promise<void> {
  await prisma.pageLayout.delete({ where: { id } });
}

/** Snapshot a revision. */
export async function snapshotPageLayoutRevision(
  pageLayoutId: string,
  data: string,
): Promise<void> {
  await prisma.pageLayoutRevision.create({
    data: { pageLayoutId, data },
  });
  // Keep max 30 revisions
  const revisions = await prisma.pageLayoutRevision.findMany({
    where: { pageLayoutId },
    orderBy: { createdAt: "desc" },
    skip: 30,
  });
  if (revisions.length > 0) {
    await prisma.pageLayoutRevision.deleteMany({
      where: { id: { in: revisions.map((r) => r.id) } },
    });
  }
}

/** List revisions for a template. */
export async function listPageLayoutRevisions(
  pageLayoutId: string,
): Promise<PageLayoutRevisionRow[]> {
  return prisma.pageLayoutRevision.findMany({
    where: { pageLayoutId },
    orderBy: { createdAt: "desc" },
    take: 30,
  }) as Promise<PageLayoutRevisionRow[]>;
}

/** Restore a revision. */
export async function restorePageLayoutRevision(
  pageLayoutId: string,
  revisionId: string,
): Promise<string | null> {
  const revision = await prisma.pageLayoutRevision.findUnique({
    where: { id: revisionId },
  });
  if (!revision || revision.pageLayoutId !== pageLayoutId) return null;
  await prisma.pageLayout.update({
    where: { id: pageLayoutId },
    data: { data: revision.data },
  });
  await snapshotPageLayoutRevision(pageLayoutId, revision.data);
  return revision.data;
}

/** Resolve which page layout template to use for a given context. */
export async function resolvePageLayout(
  context: { pageId?: string; pageType?: string; pathname?: string } = {},
): Promise<PageLayoutRow | null> {
  // 1. Check per-page assignment
  if (context.pageId) {
    const pageAssignment = await prisma.pageLayoutAssignment.findFirst({
      where: {
        tenantId: TENANT_ID,
        pageId: context.pageId,
      },
      include: { pageLayout: true },
      orderBy: { priority: "desc" },
    });
    if (pageAssignment) {
      return pageAssignment.pageLayout as PageLayoutRow;
    }
  }

  // 2. Check per-page-type assignment
  if (context.pageType) {
    const typeAssignment = await prisma.pageLayoutAssignment.findFirst({
      where: {
        tenantId: TENANT_ID,
        pageType: context.pageType,
      },
      include: { pageLayout: true },
      orderBy: { priority: "desc" },
    });
    if (typeAssignment) {
      return typeAssignment.pageLayout as PageLayoutRow;
    }
  }

  // 3. Check per-pathname assignment
  if (context.pathname) {
    const pathAssignment = await prisma.pageLayoutAssignment.findFirst({
      where: {
        tenantId: TENANT_ID,
        pageId: context.pathname,
      },
      include: { pageLayout: true },
      orderBy: { priority: "desc" },
    });
    if (pathAssignment) {
      return pathAssignment.pageLayout as PageLayoutRow;
    }
  }

  // 4. Fall back to global default
  const defaultTemplate = await prisma.pageLayout.findFirst({
    where: { tenantId: TENANT_ID, isDefault: true },
  });
  return defaultTemplate as PageLayoutRow | null;
}

/** Get all assignments for a template. */
export async function getPageLayoutAssignments(pageLayoutId: string): Promise<PageLayoutAssignmentRow[]> {
  return prisma.pageLayoutAssignment.findMany({
    where: { pageLayoutId },
    orderBy: { priority: "desc" },
  }) as Promise<PageLayoutAssignmentRow[]>;
}

/** Save assignments for a template (replaces all existing). */
export async function savePageLayoutAssignments(
  pageLayoutId: string,
  assignments: Array<{
    pageId?: string | null;
    pageType?: string | null;
    priority?: number;
  }>,
): Promise<void> {
  await prisma.$transaction([
    prisma.pageLayoutAssignment.deleteMany({
      where: { pageLayoutId },
    }),
    ...assignments.map((a, i) =>
      prisma.pageLayoutAssignment.create({
        data: {
          tenantId: TENANT_ID,
          pageLayoutId,
          pageId: a.pageId || null,
          pageType: a.pageType || null,
          priority: a.priority ?? i,
        },
      }),
    ),
  ]);
}
