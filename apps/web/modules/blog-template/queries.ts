/**
 * Blog Template Builder — Module Queries
 */
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";
import type { Prisma } from "@prisma/client";
import type { ContainerSettings } from "@/lib/blog-template/types";
import { DEFAULT_CONTAINER_SETTINGS } from "@/lib/blog-template/types";

export interface BlogTemplateData {
  blocks: import("@/lib/blog-template/types").BlogTemplateBlock[];
  containerSettings: ContainerSettings;
}

export interface BlogTemplateRow {
  id: string;
  name: string;
  type: string;
  data: string | null;
  isDefault: boolean;
  updatedAt: Date;
  createdAt: Date;
}

export interface BlogTemplateRevisionRow {
  id: string;
  blogTemplateId: string;
  data: string;
  createdAt: Date;
}

export interface BlogTemplateAssignmentRow {
  id: string;
  blogTemplateId: string;
  priority: number;
  pageId: string | null;
  pageType: string | null;
  createdAt: Date;
}

/** Parse template data JSON into blocks and container settings. */
export function parseBlogTemplateData(data: string | null): BlogTemplateData {
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
export function serializeBlogTemplateData(
  blocks: import("@/lib/page-builder/types").Block[],
  containerSettings: ContainerSettings,
): string {
  return JSON.stringify({ blocks, containerSettings });
}

/** List all blog template templates for the current tenant, optionally filtered by type. */
export async function listBlogTemplates(type?: "listing" | "single"): Promise<BlogTemplateRow[]> {
  return prisma.blogTemplate.findMany({
    where: { tenantId: TENANT_ID, ...(type ? { type } : {}) },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  }) as Promise<BlogTemplateRow[]>;
}

/** Get a single blog template by ID. */
export async function getBlogTemplate(id: string): Promise<BlogTemplateRow | null> {
  return prisma.blogTemplate.findUnique({ where: { id } }) as Promise<BlogTemplateRow | null>;
}

/** Create a new blog template. */
export async function createBlogTemplate(
  name: string,
  type: "listing" | "single",
  data?: string,
): Promise<BlogTemplateRow> {
  return prisma.blogTemplate.create({
    data: {
      tenantId: TENANT_ID,
      name,
      type,
      data: data ?? "[]",
    },
  }) as Promise<BlogTemplateRow>;
}

/** Update blog template blocks data. */
export async function updateBlogTemplateData(
  id: string,
  data: string,
): Promise<void> {
  await prisma.blogTemplate.update({
    where: { id },
    data: { data },
  });
}

/** Update blog template metadata (name, isDefault). */
export async function updateBlogTemplateMeta(
  id: string,
  patch: { name?: string; isDefault?: boolean },
): Promise<void> {
  await prisma.blogTemplate.update({
    where: { id },
    data: patch,
  });
}

/** Set a template as the default for its type, clearing other defaults of the same type. */
export async function setDefaultBlogTemplate(id: string): Promise<void> {
  const template = await prisma.blogTemplate.findUnique({ where: { id } });
  if (!template) return;

  await prisma.$transaction([
    prisma.blogTemplate.updateMany({
      where: { tenantId: TENANT_ID, type: template.type, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.blogTemplate.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);
}

/** Delete a blog template. */
export async function deleteBlogTemplate(id: string): Promise<void> {
  await prisma.blogTemplate.delete({ where: { id } });
}

/** Snapshot a revision. */
export async function snapshotBlogTemplateRevision(
  blogTemplateId: string,
  data: string,
): Promise<void> {
  await prisma.blogTemplateRevision.create({
    data: { blogTemplateId, data },
  });
  const revisions = await prisma.blogTemplateRevision.findMany({
    where: { blogTemplateId },
    orderBy: { createdAt: "desc" },
    skip: 30,
  });
  if (revisions.length > 0) {
    await prisma.blogTemplateRevision.deleteMany({
      where: { id: { in: revisions.map((r) => r.id) } },
    });
  }
}

/** List revisions for a template. */
export async function listBlogTemplateRevisions(
  blogTemplateId: string,
): Promise<BlogTemplateRevisionRow[]> {
  return prisma.blogTemplateRevision.findMany({
    where: { blogTemplateId },
    orderBy: { createdAt: "desc" },
    take: 30,
  }) as Promise<BlogTemplateRevisionRow[]>;
}

/** Restore a revision. */
export async function restoreBlogTemplateRevision(
  blogTemplateId: string,
  revisionId: string,
): Promise<string | null> {
  const revision = await prisma.blogTemplateRevision.findUnique({
    where: { id: revisionId },
  });
  if (!revision || revision.blogTemplateId !== blogTemplateId) return null;
  await prisma.blogTemplate.update({
    where: { id: blogTemplateId },
    data: { data: revision.data },
  });
  await snapshotBlogTemplateRevision(blogTemplateId, revision.data);
  return revision.data;
}

/** Resolve which blog template template to use for a given type and context. */
export async function resolveBlogTemplate(
  type: "listing" | "single",
  context: { pageId?: string; pageType?: string; pathname?: string } = {},
): Promise<BlogTemplateRow | null> {
  // 1. Check per-page assignment
  if (context.pageId) {
    const pageAssignment = await prisma.blogTemplateAssignment.findFirst({
      where: {
        tenantId: TENANT_ID,
        pageId: context.pageId,
        blogTemplate: { type },
      },
      include: { blogTemplate: true },
      orderBy: { priority: "desc" },
    });
    if (pageAssignment) {
      return pageAssignment.blogTemplate as BlogTemplateRow;
    }
  }

  // 2. Check per-page-type assignment
  if (context.pageType) {
    const typeAssignment = await prisma.blogTemplateAssignment.findFirst({
      where: {
        tenantId: TENANT_ID,
        pageType: context.pageType,
        blogTemplate: { type },
      },
      include: { blogTemplate: true },
      orderBy: { priority: "desc" },
    });
    if (typeAssignment) {
      return typeAssignment.blogTemplate as BlogTemplateRow;
    }
  }

  // 3. Check per-pathname assignment
  if (context.pathname) {
    const pathAssignment = await prisma.blogTemplateAssignment.findFirst({
      where: {
        tenantId: TENANT_ID,
        pageId: context.pathname,
        blogTemplate: { type },
      },
      include: { blogTemplate: true },
      orderBy: { priority: "desc" },
    });
    if (pathAssignment) {
      return pathAssignment.blogTemplate as BlogTemplateRow;
    }
  }

  // 4. Fall back to global default for this type
  const defaultTemplate = await prisma.blogTemplate.findFirst({
    where: { tenantId: TENANT_ID, type, isDefault: true },
  });
  return defaultTemplate as BlogTemplateRow | null;
}

/** Get all assignments for a template. */
export async function getBlogTemplateAssignments(blogTemplateId: string): Promise<BlogTemplateAssignmentRow[]> {
  return prisma.blogTemplateAssignment.findMany({
    where: { blogTemplateId },
    orderBy: { priority: "desc" },
  }) as Promise<BlogTemplateAssignmentRow[]>;
}

/** Save assignments for a template (replaces all existing). */
export async function saveBlogTemplateAssignments(
  blogTemplateId: string,
  assignments: Array<{
    pageId?: string | null;
    pageType?: string | null;
    priority?: number;
  }>,
): Promise<void> {
  await prisma.$transaction([
    prisma.blogTemplateAssignment.deleteMany({
      where: { blogTemplateId },
    }),
    ...assignments.map((a, i) =>
      prisma.blogTemplateAssignment.create({
        data: {
          tenantId: TENANT_ID,
          blogTemplateId,
          pageId: a.pageId || null,
          pageType: a.pageType || null,
          priority: a.priority ?? i,
        },
      }),
    ),
  ]);
}

export type BlogGridItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image: string | null;
  author: string | null;
  createdAt: Date;
  category: { id: string; title: string; slug: string } | null;
};

export type BlogGridCategory = { id: string; name: string; slug: string };

export type BlogGridPage = {
  items: BlogGridItem[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  categories: BlogGridCategory[];
};

export type BlogGridParams = {
  categoryId?: string;
  filterCategoryIds?: string[];
  page?: number;
  perPage?: number;
  orderBy?: "date" | "title" | "popular";
  sortOrder?: "asc" | "desc";
  search?: string;
};

export async function getBlogGridPage(params: BlogGridParams = {}): Promise<BlogGridPage> {
  const {
    categoryId = "",
    filterCategoryIds = [],
    page = 1,
    perPage = 9,
    orderBy: orderByKey = "date",
    sortOrder = "desc",
    search = "",
  } = params;

  const size = Math.min(48, Math.max(1, Math.round(perPage)));
  const current = Math.max(1, Math.round(page));
  const order: "asc" | "desc" = sortOrder === "asc" ? "asc" : "desc";

  const where: Prisma.ContentTemplateWhereInput = {
    tenantId: TENANT_ID,
    status: "LIVE",
  };

  if (categoryId) {
    where.categoryId = categoryId;
  } else if (filterCategoryIds.length > 0) {
    where.categoryId = { in: filterCategoryIds };
  }

  const term = search.trim();
  if (term) {
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { metaDesc: { contains: term, mode: "insensitive" } },
      { author: { contains: term, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.ContentTemplateOrderByWithRelationInput =
    orderByKey === "title" ? { title: order } : { createdAt: order };

  const skip = (current - 1) * size;

  const [rows, total, categoryRows] = await Promise.all([
    prisma.contentTemplate.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        metaDesc: true,
        ogImage: true,
        author: true,
        createdAt: true,
        category: { select: { id: true, title: true, slug: true } },
      },
      orderBy,
      skip,
      take: size,
    }),
    prisma.contentTemplate.count({ where }),
    prisma.category.findMany({
      where: {
        tenantId: TENANT_ID,
        status: "LIVE",
        ...(filterCategoryIds.length > 0 ? { id: { in: filterCategoryIds } } : {}),
      },
      select: { id: true, slug: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.metaDesc,
      image: row.ogImage,
      author: row.author,
      createdAt: row.createdAt,
      category: row.category,
    })),
    page: current,
    perPage: size,
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
    categories: categoryRows.map((c) => ({ id: c.id, name: c.title, slug: c.slug })),
  };
}
