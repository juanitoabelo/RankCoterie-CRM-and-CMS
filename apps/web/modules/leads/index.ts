/**
 * Leads Module — Public API
 * 
 * Provides lead management for the admin panel including lead tracking,
 * status management, and statistics.
 * 
 * @example
 * ```tsx
 * // In a server component
 * import { getLeads, getLeadStats } from "@/modules/leads";
 * 
 * const { leads, total } = await getLeads({ status: "NEW", page: 1 });
 * const stats = await getLeadStats();
 * ```
 */

// Types
/** Lead status type */
export type { LeadStatus } from "./types";
/** Lead with related data */
export type { LeadWithRelations } from "./types";
/** Lead filter options */
export type { LeadFilter } from "./types";
/** Paginated leads response */
export type { PaginatedLeads } from "./types";
/** Lead status badge configuration */
export { LEAD_STATUS_BADGE } from "./types";

// Queries
/** Get paginated leads with filters */
export { getLeads } from "./queries";
/** Get lead statistics */
export { getLeadStats } from "./queries";
/** Get a single lead by ID */
export { getLeadById } from "./queries";
