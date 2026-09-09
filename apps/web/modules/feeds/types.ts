/**
 * Feeds Module — Types
 * 
 * Defines types for data feed management.
 * Types match the actual Prisma schema fields.
 */

/** Feed status */
export type FeedStatus = "ACTIVE" | "INACTIVE";

/** Feed with details */
export interface FeedWithDetails {
  id: string;
  name: string;
  domainKey: string | null;
  url: string | null;
  type: string;
  status: string;
  lastFetchedAt: Date | null;
  lastError: string | null;
}

/** Feed query filters */
export interface FeedFilter {
  status?: FeedStatus | "ALL";
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated response */
export interface PaginatedFeeds {
  items: FeedWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
