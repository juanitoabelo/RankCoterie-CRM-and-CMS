/**
 * Content Module — Database Queries
 * 
 * All database queries for content operations (articles, categories, pages, sections, templates).
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import type { 
  ContentFilter, 
  PaginatedContent, 
  ContentTemplateWithRelations,
  CategoryWithRelations,
  PageWithRelations,
  SectionWithRelations 
} from "./types";

const DEFAULT_PAGE_SIZE = 50;

// ============================================================================
// Articles / Templates
// ============================================================================

/** Fetch paginated articles/templates */
export async function getArticles(filter: ContentFilter = {}): Promise<PaginatedContent<ContentTemplateWithRelations>> {
  const { status = "ALL", categoryId, search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filter;
  const skip = (page - 1) * pageSize;
  
  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  if (status !== "ALL") where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (search) where.title = { contains: search, mode: "insensitive" };
  
  const [items, total] = await Promise.all([
    prisma.contentTemplate.findMany({
      where,
      include: { category: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.contentTemplate.count({ where }),
  ]);

  return { items: items as ContentTemplateWithRelations[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Fetch articles for admin — includes variants and category for display */
export async function getArticlesForAdmin() {
  return prisma.contentTemplate.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      category: { select: { title: true } },
      variants: { select: { id: true, regionId: true, status: true } },
    },
  });
}

/** Fetch a single article by ID */
export async function getArticleById(id: string) {
  return prisma.contentTemplate.findUnique({
    where: { id },
    include: { category: true },
  });
}

/** Fetch article edit data — includes variants, categories, and regions */
export async function getArticleEditData(id: string) {
  const [article, categories, regions] = await Promise.all([
    prisma.contentTemplate.findUnique({
      where: { id },
      include: { variants: { select: { id: true, regionId: true, status: true } } },
    }),
    prisma.category.findMany({ orderBy: { slug: "asc" } }),
    prisma.region.findMany({ orderBy: [{ priority: "asc" }, { id: "asc" }] }),
  ]);
  return { article, categories, regions };
}

// ============================================================================
// Categories
// ============================================================================

/** Fetch all categories */
export async function getCategories(): Promise<CategoryWithRelations[]> {
  return prisma.category.findMany({
    where: { tenantId: TENANT_ID },
    include: { 
      parent: { select: { slug: true } },
      _count: { select: { listingCategories: true, children: true } },
    },
    orderBy: { title: "asc" },
  }) as unknown as Promise<CategoryWithRelations[]>;
}

/** Fetch a single category by ID */
export async function getCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: { parent: true, children: true },
  });
}

/** Fetch categories for admin — includes parent info */
export async function getCategoriesForAdmin() {
  return prisma.category.findMany({
    orderBy: [{ status: "asc" }, { slug: "asc" }],
    include: { parent: { select: { id: true, title: true } } },
  });
}

/** Fetch category edit data — includes all categories for parent dropdown */
export async function getCategoryEditData(id: string) {
  const [category, allCategories] = await Promise.all([
    prisma.category.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { slug: "asc" } }),
  ]);
  return { category, allCategories };
}

// ============================================================================
// Pages
// ============================================================================

/** Fetch all pages */
export async function getPages(): Promise<PageWithRelations[]> {
  return prisma.page.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { createdAt: "desc" },
  }) as Promise<PageWithRelations[]>;
}

/** Fetch a single page by ID */
export async function getPageById(id: string) {
  return prisma.page.findUnique({
    where: { id },
    include: { revisions: true },
  });
}

// ============================================================================
// Sections
// ============================================================================

/** Fetch all sections */
export async function getSections(): Promise<SectionWithRelations[]> {
  return prisma.section.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { order: "asc" },
  }) as Promise<SectionWithRelations[]>;
}

/** Fetch a single section by ID */
export async function getSectionById(id: string) {
  return prisma.section.findUnique({
    where: { id },
  });
}
