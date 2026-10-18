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
/** Lead disposition vocabulary */
export { LEAD_DISPOSITIONS } from "./types";
/** Lead disposition type */
export type { LeadDisposition } from "./types";
/** Intake schema (legacy-aligned field list + sections) */
export {
  LEAD_INTAKE_FIELDS,
  LEAD_INTAKE_FIELD_MAP,
  LEAD_INTAKE_SECTIONS,
  intakeFieldsFor,
  isYesNoField,
  parseIntakeValue,
  formatIntakeValue,
} from "./types";
export type {
  LeadIntakeField,
  LeadIntakeFieldType,
  LeadIntakeSection,
  LeadIntakeSectionKey,
} from "./types";

// Queries
/** Get paginated leads with filters */
export { getLeads } from "./queries";
/** Get lead statistics */
export { getLeadStats } from "./queries";
/** Get lead statistics within an optional created-at range */
export { getLeadStatsInRange } from "./queries";
/** Get a single lead by ID */
export { getLeadById } from "./queries";
