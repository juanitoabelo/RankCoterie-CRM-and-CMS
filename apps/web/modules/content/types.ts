/**
 * Content Module — Types
 * 
 * Defines types for content management (articles, categories, pages, sections, templates).
 */

/** Content status */
export type ContentStatus = "DRAFT" | "PENDING_REVIEW" | "LIVE" | "ARCHIVED";

/** Article/Template with relations */
export interface ContentTemplateWithRelations {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  categoryId: string | null;
  category?: { id: string; title: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Category with relations */
export interface CategoryWithRelations {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  parentId: string | null;
  parent?: { slug: string } | null;
  _count?: { listings: number; children: number };
}

/** Page with relations */
export interface PageWithRelations {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  createdAt: Date;
}

/** Section with relations */
export interface SectionWithRelations {
  id: string;
  title: string;
  heading: string | null;
  status: ContentStatus;
  order: number;
}

/** Content query filters */
export interface ContentFilter {
  status?: ContentStatus | "ALL";
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated content response */
export interface PaginatedContent<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Status badge mapping */
export const CONTENT_STATUS_BADGE: Record<ContentStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  PENDING_REVIEW: "bg-amber-100 text-amber-800",
  LIVE: "bg-emerald-100 text-emerald-800",
  ARCHIVED: "bg-zinc-100 text-zinc-500",
};

/** Valid status filter values */
export const CONTENT_STATUS_FILTERS = ["ALL", "DRAFT", "PENDING_REVIEW", "LIVE", "ARCHIVED"] as const;
