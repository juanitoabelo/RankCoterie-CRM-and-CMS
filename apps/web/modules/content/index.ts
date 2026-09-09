/**
 * Content Module — Public API
 * 
 * Provides content management for articles, categories, pages, and sections.
 * 
 * @example
 * ```tsx
 * // In a server component
 * import { getArticles, getCategories } from "@/modules/content";
 * 
 * const { articles, total } = await getArticles({ status: "PUBLISHED", page: 1 });
 * const categories = await getCategories();
 * ```
 */

// Types
/** Content status type */
export type { ContentStatus } from "./types";
/** Content template with relations */
export type { ContentTemplateWithRelations } from "./types";
/** Category with relations */
export type { CategoryWithRelations } from "./types";
/** Page with relations */
export type { PageWithRelations } from "./types";
/** Section with relations */
export type { SectionWithRelations } from "./types";
/** Content filter options */
export type { ContentFilter } from "./types";
/** Paginated content response */
export type { PaginatedContent } from "./types";
/** Content status badge configuration */
export { CONTENT_STATUS_BADGE } from "./types";
/** Content status filter options */
export { CONTENT_STATUS_FILTERS } from "./types";

// Queries
/** Get paginated articles with filters */
export { getArticles } from "./queries";
/** Get articles for admin with variants */
export { getArticlesForAdmin } from "./queries";
/** Get a single article by ID */
export { getArticleById } from "./queries";
/** Get article edit data with categories and regions */
export { getArticleEditData } from "./queries";
/** Get all categories */
export { getCategories } from "./queries";
/** Get categories for admin with parent info */
export { getCategoriesForAdmin } from "./queries";
/** Get a single category by ID */
export { getCategoryById } from "./queries";
/** Get category edit data with all categories for parent dropdown */
export { getCategoryEditData } from "./queries";
/** Get paginated pages */
export { getPages } from "./queries";
/** Get a single page by ID */
export { getPageById } from "./queries";
/** Get paginated sections */
export { getSections } from "./queries";
/** Get a single section by ID */
export { getSectionById } from "./queries";
