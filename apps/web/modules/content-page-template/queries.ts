/**
 * Content Page Template Builder — Module Queries
 *
 * One template family serving both Topic and SubTopic single pages,
 * discriminated by `kind`. Mirrors the GeoCategoryTemplate module.
 */
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";
import type { Block } from "@/lib/page-builder/types";
import type { ContainerSettings, ContentPageKind } from "@/lib/content-page-template/types";
import {
  DEFAULT_CONTAINER_SETTINGS,
  defaultFullwidthBlocks,
  defaultSidebarBlocks,
} from "@/lib/content-page-template/types";

export type CpTemplateLayoutTag = "FULLWIDTH" | "SIDEBAR";

export interface ContentPageTemplateData {
  blocks: Block[];
  containerSettings: ContainerSettings;
}

export interface ContentPageTemplateRow {
  id: string;
  name: string;
  kind: string;
  layout: string;
  data: string | null;
  isDefault: boolean;
  updatedAt: Date;
  createdAt: Date;
}

export interface ContentPageTemplateRevisionRow {
  id: string;
  contentPageTemplateId: string;
  data: string;
  createdAt: Date;
}

export interface ContentPageTemplateAssignmentRow {
  id: string;
  contentPageTemplateId: string;
  priority: number;
  pageId: string | null;
  pageType: string | null;
  createdAt: Date;
}

/** Parse template data JSON into blocks and container settings. */
export function parseContentPageTemplateData(data: string | null): ContentPageTemplateData {
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
export function serializeContentPageTemplateData(
  blocks: Block[],
  containerSettings: ContainerSettings,
): string {
  return JSON.stringify({ blocks, containerSettings });
}

/** List templates for the tenant, optionally narrowed to a kind and/or layout. */
export async function listContentPageTemplates(
  kind?: ContentPageKind,
  layout?: CpTemplateLayoutTag,
): Promise<ContentPageTemplateRow[]> {
  return prisma.contentPageTemplate.findMany({
    where: { tenantId: TENANT_ID, ...(kind ? { kind } : {}), ...(layout ? { layout } : {}) },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  }) as Promise<ContentPageTemplateRow[]>;
}

/** Get a single template by ID. */
export async function getContentPageTemplate(id: string): Promise<ContentPageTemplateRow | null> {
  return prisma.contentPageTemplate.findUnique({ where: { id } }) as Promise<ContentPageTemplateRow | null>;
}

/** Create a new template for a kind. */
export async function createContentPageTemplate(
  name: string,
  kind: ContentPageKind,
  opts: { layout?: CpTemplateLayoutTag; data?: string; isDefault?: boolean } = {},
): Promise<ContentPageTemplateRow> {
  const layout = opts.layout ?? "FULLWIDTH";
  return prisma.contentPageTemplate.create({
    data: {
      tenantId: TENANT_ID,
      name,
      kind,
      layout,
      data: opts.data ?? serializeContentPageTemplateData(
        layout === "SIDEBAR" ? defaultSidebarBlocks(kind) : defaultFullwidthBlocks(kind),
        DEFAULT_CONTAINER_SETTINGS,
      ),
      isDefault: opts.isDefault ?? false,
    },
  }) as Promise<ContentPageTemplateRow>;
}

/**
 * Seed the two default variations (Fullwidth + Right Sidebar) for a kind when
 * none exist yet. Idempotent — only runs on an empty set for that kind.
 */
export async function ensureDefaultContentPageTemplates(kind: ContentPageKind): Promise<void> {
  try {
    const count = await prisma.contentPageTemplate.count({ where: { tenantId: TENANT_ID, kind } });
    if (count > 0) return;
    const label = kind === "topic" ? "Topic" : "SubTopic";
    await prisma.contentPageTemplate.createMany({
      data: [
        {
          tenantId: TENANT_ID,
          name: `${label} Fullwidth — Default`,
          kind,
          layout: "FULLWIDTH",
          isDefault: true,
          data: serializeContentPageTemplateData(defaultFullwidthBlocks(kind), DEFAULT_CONTAINER_SETTINGS),
        },
        {
          tenantId: TENANT_ID,
          name: `${label} Right Sidebar — Default`,
          kind,
          layout: "SIDEBAR",
          isDefault: false,
          data: serializeContentPageTemplateData(defaultSidebarBlocks(kind), DEFAULT_CONTAINER_SETTINGS),
        },
      ],
    });
  } catch {
    // Table missing (migration pending) — the admin list simply shows nothing.
  }
}

/** Update template blocks data. */
export async function updateContentPageTemplateData(id: string, data: string): Promise<void> {
  await prisma.contentPageTemplate.update({ where: { id }, data: { data } });
}

/** Update template metadata (name, isDefault, layout). */
export async function updateContentPageTemplateMeta(
  id: string,
  patch: { name?: string; isDefault?: boolean; layout?: string },
): Promise<void> {
  await prisma.contentPageTemplate.update({ where: { id }, data: patch });
}

/** Set a template as the default for its kind, clearing other defaults of that kind. */
export async function setDefaultContentPageTemplate(id: string): Promise<void> {
  const template = await prisma.contentPageTemplate.findUnique({ where: { id } });
  if (!template) return;
  await prisma.$transaction([
    prisma.contentPageTemplate.updateMany({
      where: { tenantId: TENANT_ID, kind: template.kind, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.contentPageTemplate.update({ where: { id }, data: { isDefault: true } }),
  ]);
}

/** Delete a template (revisions + assignments cascade). */
export async function deleteContentPageTemplate(id: string): Promise<void> {
  await prisma.contentPageTemplate.delete({ where: { id } });
}

/** Snapshot a revision (keeps the latest 30). */
export async function snapshotContentPageTemplateRevision(
  contentPageTemplateId: string,
  data: string,
): Promise<void> {
  await prisma.contentPageTemplateRevision.create({ data: { contentPageTemplateId, data } });
  const revisions = await prisma.contentPageTemplateRevision.findMany({
    where: { contentPageTemplateId },
    orderBy: { createdAt: "desc" },
    skip: 30,
  });
  if (revisions.length > 0) {
    await prisma.contentPageTemplateRevision.deleteMany({
      where: { id: { in: revisions.map((r) => r.id) } },
    });
  }
}

/** List revisions for a template. */
export async function listContentPageTemplateRevisions(
  contentPageTemplateId: string,
): Promise<ContentPageTemplateRevisionRow[]> {
  return prisma.contentPageTemplateRevision.findMany({
    where: { contentPageTemplateId },
    orderBy: { createdAt: "desc" },
    take: 30,
  }) as Promise<ContentPageTemplateRevisionRow[]>;
}

/** Restore a revision. */
export async function restoreContentPageTemplateRevision(
  contentPageTemplateId: string,
  revisionId: string,
): Promise<string | null> {
  const revision = await prisma.contentPageTemplateRevision.findUnique({ where: { id: revisionId } });
  if (!revision || revision.contentPageTemplateId !== contentPageTemplateId) return null;
  await prisma.contentPageTemplate.update({ where: { id: contentPageTemplateId }, data: { data: revision.data } });
  await snapshotContentPageTemplateRevision(contentPageTemplateId, revision.data);
  return revision.data;
}

/**
 * Resolve which template renders a Topic/SubTopic single page:
 * per-page assignment → tenant default for the kind → null (default layout).
 */
export async function resolveContentPageTemplate(
  kind: ContentPageKind,
  pageId: string,
): Promise<ContentPageTemplateRow | null> {
  try {
    const assignment = await prisma.contentPageTemplateAssignment.findFirst({
      where: { tenantId: TENANT_ID, pageId, contentPageTemplate: { kind } },
      include: { contentPageTemplate: true },
      orderBy: { priority: "desc" },
    });
    if (assignment) return assignment.contentPageTemplate as ContentPageTemplateRow;

    const defaultTemplate = await prisma.contentPageTemplate.findFirst({
      where: { tenantId: TENANT_ID, kind, isDefault: true },
    });
    return (defaultTemplate as ContentPageTemplateRow | null) ?? null;
  } catch {
    // Table missing or DB unreachable — render the default page layout instead.
    return null;
  }
}

/** The template currently assigned to a page (null when only the default applies). */
export async function getContentPageTemplateAssignment(
  pageId: string,
): Promise<ContentPageTemplateAssignmentRow | null> {
  const assignment = await prisma.contentPageTemplateAssignment.findFirst({
    where: { tenantId: TENANT_ID, pageId },
    orderBy: { priority: "desc" },
  });
  return assignment as ContentPageTemplateAssignmentRow | null;
}

/**
 * Assign a template to one page (replaces any prior assignment for that page).
 * Pass null to clear and fall back to the default.
 */
export async function assignContentPageTemplate(
  kind: ContentPageKind,
  pageId: string,
  templateId: string | null,
): Promise<void> {
  await prisma.contentPageTemplateAssignment.deleteMany({
    where: { tenantId: TENANT_ID, pageId },
  });
  if (templateId) {
    await prisma.contentPageTemplateAssignment.create({
      data: {
        tenantId: TENANT_ID,
        contentPageTemplateId: templateId,
        pageId,
        pageType: kind,
        priority: 10,
      },
    });
  }
}
