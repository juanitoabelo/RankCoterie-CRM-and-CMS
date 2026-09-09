/**
 * Leads Module — Types
 * 
 * Defines types for lead management.
 */

/** Lead status */
export type LeadStatus = "NEW" | "OPEN" | "CLOSED" | "ARCHIVED";

/** Lead with relations */
export interface LeadWithRelations {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  status: string;
  disposition: string | null;
  campaignId: string | null;
  landingPageId: string | null;
  publisherId: string | null;
  createdAt: Date;
  notes: Array<{ id: string; note: string; createdAt: Date }>;
  todos: Array<{ id: string; text: string; finishedAt: Date | null }>;
}

/** Lead query filters */
export interface LeadFilter {
  status?: LeadStatus | "ALL";
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated response */
export interface PaginatedLeads {
  items: LeadWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Lead status badge mapping */
export const LEAD_STATUS_BADGE: Record<LeadStatus, string> = {
  NEW: "bg-blue-50 text-blue-700",
  OPEN: "bg-amber-50 text-amber-700",
  CLOSED: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-zinc-100 text-zinc-500",
};
