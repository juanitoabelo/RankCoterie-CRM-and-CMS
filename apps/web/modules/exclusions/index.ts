/**
 * Exclusions Module — Public API
 * 
 * Provides company exclusion management for tracking excluded companies.
 * 
 * @example
 * ```tsx
 * // In a server component
 * import { getExclusions, getActiveExclusions } from "@/modules/exclusions";
 * 
 * const { exclusions, total } = await getExclusions({ page: 1 });
 * const active = await getActiveExclusions();
 * ```
 */

// Types
/** Exclusion with details */
export type { ExclusionWithDetails } from "./types";
/** Exclusion filter options */
export type { ExclusionFilter } from "./types";
/** Paginated exclusions response */
export type { PaginatedExclusions } from "./types";

// Queries
/** Get paginated exclusions with filters */
export { getExclusions } from "./queries";
/** Get all active exclusions */
export { getActiveExclusions } from "./queries";
/** Get a single exclusion by ID */
export { getExclusionById } from "./queries";
