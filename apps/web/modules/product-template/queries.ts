/**
 * Product Template Builder — Module Queries
 */
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";
export {
  parseProductTemplateData,
  serializeProductTemplateData,
} from "@/lib/product-template/serialization";

export interface ProductTemplateRow {
  id: string;
  name: string;
  type: string;
  data: string | null;
  isDefault: boolean;
  updatedAt: Date;
  createdAt: Date;
}

export interface ProductTemplateRevisionRow {
  id: string;
  productTemplateId: string;
  data: string;
  createdAt: Date;
}

export interface ProductTemplateAssignmentRow {
  id: string;
  productTemplateId: string;
  priority: number;
  pageId: string | null;
  pageType: string | null;
  createdAt: Date;
}

/** List all product template templates for the current tenant, optionally filtered by type. */
export async function listProductTemplates(type?: "single"): Promise<ProductTemplateRow[]> {
  return prisma.productTemplate.findMany({
    where: { tenantId: TENANT_ID, ...(type ? { type } : {}) },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  }) as Promise<ProductTemplateRow[]>;
}

/** Get a single product template by ID. */
export async function getProductTemplate(id: string): Promise<ProductTemplateRow | null> {
  return prisma.productTemplate.findFirst({
    where: { id, tenantId: TENANT_ID },
  }) as Promise<ProductTemplateRow | null>;
}

/** Create a new product template. */
export async function createProductTemplate(
  name: string,
  type: "single",
  data?: string,
): Promise<ProductTemplateRow> {
  return prisma.productTemplate.create({
    data: {
      tenantId: TENANT_ID,
      name,
      type,
      data: data ?? "[]",
    },
  }) as Promise<ProductTemplateRow>;
}

/** Update product template blocks data. */
export async function updateProductTemplateData(
  id: string,
  data: string,
): Promise<void> {
  await prisma.productTemplate.update({
    where: { id },
    data: { data },
  });
}

/** Update product template metadata (name, isDefault). */
export async function updateProductTemplateMeta(
  id: string,
  patch: { name?: string; isDefault?: boolean },
): Promise<void> {
  await prisma.productTemplate.update({
    where: { id },
    data: patch,
  });
}

/** Set a template as the default for its type, clearing other defaults of the same type. */
export async function setDefaultProductTemplate(id: string): Promise<void> {
  const template = await prisma.productTemplate.findUnique({ where: { id } });
  if (!template) return;

  await prisma.$transaction([
    prisma.productTemplate.updateMany({
      where: { tenantId: TENANT_ID, type: template.type, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.productTemplate.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);
}

/** Delete a product template. */
export async function deleteProductTemplate(id: string): Promise<void> {
  await prisma.productTemplate.delete({ where: { id } });
}

/** Snapshot a revision. */
export async function snapshotProductTemplateRevision(
  productTemplateId: string,
  data: string,
): Promise<void> {
  await prisma.productTemplateRevision.create({
    data: { productTemplateId, data },
  });
  const revisions = await prisma.productTemplateRevision.findMany({
    where: { productTemplateId },
    orderBy: { createdAt: "desc" },
    skip: 30,
  });
  if (revisions.length > 0) {
    await prisma.productTemplateRevision.deleteMany({
      where: { id: { in: revisions.map((r) => r.id) } },
    });
  }
}

/** List revisions for a template. */
export async function listProductTemplateRevisions(
  productTemplateId: string,
): Promise<ProductTemplateRevisionRow[]> {
  return prisma.productTemplateRevision.findMany({
    where: { productTemplateId },
    orderBy: { createdAt: "desc" },
    take: 30,
  }) as Promise<ProductTemplateRevisionRow[]>;
}

/** Restore a revision. */
export async function restoreProductTemplateRevision(
  productTemplateId: string,
  revisionId: string,
): Promise<string | null> {
  const revision = await prisma.productTemplateRevision.findUnique({
    where: { id: revisionId },
  });
  if (!revision || revision.productTemplateId !== productTemplateId) return null;
  await prisma.productTemplate.update({
    where: { id: productTemplateId },
    data: { data: revision.data },
  });
  await snapshotProductTemplateRevision(productTemplateId, revision.data);
  return revision.data;
}

/** Resolve which product template to use for a given type and context. */
export async function resolveProductTemplate(
  type: "single",
  context: { pageId?: string; pageType?: string; pathname?: string } = {},
): Promise<ProductTemplateRow | null> {
  // 1. Check per-page assignment
  if (context.pageId) {
    const pageAssignment = await prisma.productTemplateAssignment.findFirst({
      where: {
        tenantId: TENANT_ID,
        pageId: context.pageId,
        productTemplate: { type },
      },
      include: { productTemplate: true },
      orderBy: { priority: "desc" },
    });
    if (pageAssignment) {
      return pageAssignment.productTemplate as ProductTemplateRow;
    }
  }

  // 2. Check per-page-type assignment
  if (context.pageType) {
    const typeAssignment = await prisma.productTemplateAssignment.findFirst({
      where: {
        tenantId: TENANT_ID,
        pageType: context.pageType,
        productTemplate: { type },
      },
      include: { productTemplate: true },
      orderBy: { priority: "desc" },
    });
    if (typeAssignment) {
      return typeAssignment.productTemplate as ProductTemplateRow;
    }
  }

  // 3. Check per-pathname assignment
  if (context.pathname) {
    const pathAssignment = await prisma.productTemplateAssignment.findFirst({
      where: {
        tenantId: TENANT_ID,
        pageId: context.pathname,
        productTemplate: { type },
      },
      include: { productTemplate: true },
      orderBy: { priority: "desc" },
    });
    if (pathAssignment) {
      return pathAssignment.productTemplate as ProductTemplateRow;
    }
  }

  // 4. Fall back to global default for this type
  const defaultTemplate = await prisma.productTemplate.findFirst({
    where: { tenantId: TENANT_ID, type, isDefault: true },
  });
  return defaultTemplate as ProductTemplateRow | null;
}

/** Get all assignments for a template. */
export async function getProductTemplateAssignments(productTemplateId: string): Promise<ProductTemplateAssignmentRow[]> {
  return prisma.productTemplateAssignment.findMany({
    where: { productTemplateId },
    orderBy: { priority: "desc" },
  }) as Promise<ProductTemplateAssignmentRow[]>;
}

/** Save assignments for a template (replaces all existing). */
export async function saveProductTemplateAssignments(
  productTemplateId: string,
  assignments: Array<{
    pageId?: string | null;
    pageType?: string | null;
    priority?: number;
  }>,
): Promise<void> {
  const productIds = assignments
    .map((assignment) => assignment.pageId)
    .filter((pageId): pageId is string => Boolean(pageId));
  await prisma.$transaction([
    ...(productIds.length > 0
      ? [
          prisma.productTemplateAssignment.deleteMany({
            where: {
              tenantId: TENANT_ID,
              pageId: { in: productIds },
              productTemplateId: { not: productTemplateId },
            },
          }),
        ]
      : []),
    prisma.productTemplateAssignment.deleteMany({
      where: { productTemplateId },
    }),
    ...assignments.map((a, i) =>
      prisma.productTemplateAssignment.create({
        data: {
          tenantId: TENANT_ID,
          productTemplateId,
          pageId: a.pageId || null,
          pageType: a.pageType || null,
          priority: a.priority ?? i,
        },
      }),
    ),
  ]);
}