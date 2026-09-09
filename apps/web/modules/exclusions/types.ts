/**
 * Exclusions Module — Types
 * 
 * Defines types for company exclusion management.
 */

/** Exclusion with details */
export interface ExclusionWithDetails {
  id: string;
  companyName: string | null;
  domainKey: string | null;
  reason: string | null;
  isActive: boolean;
  createdAt: Date;
}

/** Exclusion query filters */
export interface ExclusionFilter {
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated response */
export interface PaginatedExclusions {
  items: ExclusionWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
