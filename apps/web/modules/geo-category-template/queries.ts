/**
 * Geo Category Template Builder — Module Queries
 */
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";
import type { ContainerSettings } from "@/lib/geo-category-template/types";
import { DEFAULT_CONTAINER_SETTINGS } from "@/lib/geo-category-template/types";
import {
  DEFAULT_GEO_FULLWIDTH_BLOCKS,
  DEFAULT_GEO_SIDEBAR_BLOCKS,
  type GeoCategoryTemplateBlock,
} from "@/lib/geo-category-template/types";

export type GeoTemplateLayoutTag = "FULLWIDTH" | "SIDEBAR";

export interface GeoCategoryTemplateData {
  blocks: GeoCategoryTemplateBlock[];
  containerSettings: ContainerSettings;
}

export interface GeoCategoryTemplateRow {
  id: string;
  name: string;
  type: string;
  layout: string;
  data: string | null;
  isDefault: boolean;
  updatedAt: Date;
  createdAt: Date;
}

export interface GeoCategoryTemplateRevisionRow {
  id: string;
  geoCategoryTemplateId: string;
  data: string;
  createdAt: Date;
}

export interface GeoCategoryTemplateAssignmentRow {
  id: string;
  geoCategoryTemplateId: string;
  priority: number;
  pageId: string | null;
  pageType: string | null;
  createdAt: Date;
}

/** Parse template data JSON into blocks and container settings. */
export function parseGeoCategoryTemplateData(data: string | null): GeoCategoryTemplateData {
  if (!data) {
    return { blocks: [], containerSettings: DEFAULT_CONTAINER_SETTINGS };
  }
  try {
    const parsed = JSON.parse(data);
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
export function serializeGeoCategoryTemplateData(
  blocks: import("@/lib/page-builder/types").Block[],
  containerSettings: ContainerSettings,
): string {
  return JSON.stringify({ blocks, containerSettings });
}

/** List all geo category templates for the current tenant, optionally filtered by layout. */
export async function listGeoCategoryTemplates(
  layout?: GeoTemplateLayoutTag,
): Promise<GeoCategoryTemplateRow[]> {
  return prisma.geoCategoryTemplate.findMany({
    where: { tenantId: TENANT_ID, ...(layout ? { layout } : {}) },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  }) as Promise<GeoCategoryTemplateRow[]>;
}

/** Get a single geo category template by ID. */
export async function getGeoCategoryTemplate(id: string): Promise<GeoCategoryTemplateRow | null> {
  return prisma.geoCategoryTemplate.findUnique({ where: { id } }) as Promise<GeoCategoryTemplateRow | null>;
}

/** Create a new geo category template. */
export async function createGeoCategoryTemplate(
  name: string,
  opts: { layout?: GeoTemplateLayoutTag; data?: string; isDefault?: boolean } = {},
): Promise<GeoCategoryTemplateRow> {
  return prisma.geoCategoryTemplate.create({
    data: {
      tenantId: TENANT_ID,
      name,
      type: "single",
      layout: opts.layout ?? "FULLWIDTH",
      data: opts.data ?? "[]",
      isDefault: opts.isDefault ?? false,
    },
  }) as Promise<GeoCategoryTemplateRow>;
}

/**
 * Seed the two default variations (Fullwidth + Right Sidebar) when the tenant
 * has no geo category templates yet. Idempotent — only runs on an empty table.
 */
export async function ensureDefaultGeoCategoryTemplates(): Promise<void> {
  try {
    const count = await prisma.geoCategoryTemplate.count({ where: { tenantId: TENANT_ID } });
    if (count > 0) return;
    await prisma.geoCategoryTemplate.createMany({
    data: [
      {
        tenantId: TENANT_ID,
        name: "Fullwidth — Default",
        type: "single",
        layout: "FULLWIDTH",
        isDefault: true,
        data: serializeGeoCategoryTemplateData(
          DEFAULT_GEO_FULLWIDTH_BLOCKS as unknown as import("@/lib/page-builder/types").Block[],
          DEFAULT_CONTAINER_SETTINGS,
        ),
      },
      {
        tenantId: TENANT_ID,
        name: "Right Sidebar — Default",
        type: "single",
        layout: "SIDEBAR",
        isDefault: false,
        data: serializeGeoCategoryTemplateData(
          DEFAULT_GEO_SIDEBAR_BLOCKS as unknown as import("@/lib/page-builder/types").Block[],
          DEFAULT_CONTAINER_SETTINGS,
        ),
      },
    ],
  });
  } catch {
    // Client/table not ready yet (migration pending) — the admin list page
    // simply shows no templates until the schema is applied.
  }
}

/** Update geo category template blocks data. */
export async function updateGeoCategoryTemplateData(id: string, data: string): Promise<void> {
  await prisma.geoCategoryTemplate.update({
    where: { id },
    data: { data },
  });
}

/** Update geo category template metadata (name, isDefault, layout). */
export async function updateGeoCategoryTemplateMeta(
  id: string,
  patch: { name?: string; isDefault?: boolean; layout?: string },
): Promise<void> {
  await prisma.geoCategoryTemplate.update({
    where: { id },
    data: patch,
  });
}

/** Set a template as the default, clearing other defaults. */
export async function setDefaultGeoCategoryTemplate(id: string): Promise<void> {
  const template = await prisma.geoCategoryTemplate.findUnique({ where: { id } });
  if (!template) return;

  await prisma.$transaction([
    prisma.geoCategoryTemplate.updateMany({
      where: { tenantId: TENANT_ID, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.geoCategoryTemplate.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);
}

/** Delete a geo category template (revisions + assignments cascade). */
export async function deleteGeoCategoryTemplate(id: string): Promise<void> {
  await prisma.geoCategoryTemplate.delete({ where: { id } });
}

/** Snapshot a revision (keeps the latest 30). */
export async function snapshotGeoCategoryTemplateRevision(
  geoCategoryTemplateId: string,
  data: string,
): Promise<void> {
  await prisma.geoCategoryTemplateRevision.create({
    data: { geoCategoryTemplateId, data },
  });
  const revisions = await prisma.geoCategoryTemplateRevision.findMany({
    where: { geoCategoryTemplateId },
    orderBy: { createdAt: "desc" },
    skip: 30,
  });
  if (revisions.length > 0) {
    await prisma.geoCategoryTemplateRevision.deleteMany({
      where: { id: { in: revisions.map((r) => r.id) } },
    });
  }
}

/** List revisions for a template. */
export async function listGeoCategoryTemplateRevisions(
  geoCategoryTemplateId: string,
): Promise<GeoCategoryTemplateRevisionRow[]> {
  return prisma.geoCategoryTemplateRevision.findMany({
    where: { geoCategoryTemplateId },
    orderBy: { createdAt: "desc" },
    take: 30,
  }) as Promise<GeoCategoryTemplateRevisionRow[]>;
}

/** Restore a revision. */
export async function restoreGeoCategoryTemplateRevision(
  geoCategoryTemplateId: string,
  revisionId: string,
): Promise<string | null> {
  const revision = await prisma.geoCategoryTemplateRevision.findUnique({ where: { id: revisionId } });
  if (!revision || revision.geoCategoryTemplateId !== geoCategoryTemplateId) return null;
  await prisma.geoCategoryTemplate.update({
    where: { id: geoCategoryTemplateId },
    data: { data: revision.data },
  });
  await snapshotGeoCategoryTemplateRevision(geoCategoryTemplateId, revision.data);
  return revision.data;
}

/**
 * Resolve which template renders a GeoCategory single page:
 * per-category assignment → tenant default → null (page renders its default layout).
 */
export async function resolveGeoCategoryTemplate(
  categoryId: string,
): Promise<GeoCategoryTemplateRow | null> {
  try {
    const assignment = await prisma.geoCategoryTemplateAssignment.findFirst({
      where: {
        tenantId: TENANT_ID,
        pageId: categoryId,
        geoCategoryTemplate: { type: "single" },
      },
      include: { geoCategoryTemplate: true },
      orderBy: { priority: "desc" },
    });
    if (assignment) return assignment.geoCategoryTemplate as GeoCategoryTemplateRow;

    const defaultTemplate = await prisma.geoCategoryTemplate.findFirst({
      where: { tenantId: TENANT_ID, type: "single", isDefault: true },
    });
    return (defaultTemplate as GeoCategoryTemplateRow | null) ?? null;
  } catch {
    // Table missing (migration not applied yet) or DB unreachable — render the
    // default page layout instead of failing the route.
    return null;
  }
}

/** The template currently assigned to a category (null when only the default applies). */
export async function getGeoCategoryTemplateAssignment(
  categoryId: string,
): Promise<GeoCategoryTemplateAssignmentRow | null> {
  const assignment = await prisma.geoCategoryTemplateAssignment.findFirst({
    where: { tenantId: TENANT_ID, pageId: categoryId },
    orderBy: { priority: "desc" },
  });
  return assignment as GeoCategoryTemplateAssignmentRow | null;
}

/**
 * Assign a template to one GeoCategory (replaces any prior per-category
 * assignment for that category). Pass null to clear and fall back to the default.
 */
export async function assignGeoCategoryTemplate(
  categoryId: string,
  templateId: string | null,
): Promise<void> {
  await prisma.geoCategoryTemplateAssignment.deleteMany({
    where: { tenantId: TENANT_ID, pageId: categoryId },
  });
  if (templateId) {
    await prisma.geoCategoryTemplateAssignment.create({
      data: {
        tenantId: TENANT_ID,
        geoCategoryTemplateId: templateId,
        pageId: categoryId,
        pageType: "geoCategory",
        priority: 10,
      },
    });
  }
}
