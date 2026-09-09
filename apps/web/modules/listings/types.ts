/**
 * Listings Module — Types
 * 
 * Defines types for directory listing management.
 */

/** Listing status enum */
export type ListingStatus = "DRAFT" | "PENDING_REVIEW" | "LIVE" | "SUSPENDED" | "EXPIRED";

/** Listing tier enum */
export type ListingTier = "FREE" | "BASIC" | "PREMIUM" | "FEATURED";

/** Listing with related data */
export interface ListingWithRelations {
  id: string;
  title: string;
  slug: string;
  city: string | null;
  state: string | null;
  tier: ListingTier;
  status: ListingStatus;
  createdAt: Date;
  categories: Array<{
    id: string;
    categoryId: string;
    listingId: string;
    category: {
      id: string;
      title: string;
    };
  }>;
  subscription: {
    stripeSubId: string | null;
    currentPeriodEnd: Date | null;
  } | null;
}

/** Paginated listings response */
export interface PaginatedListings {
  listings: ListingWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Listings query filters */
export interface ListingsFilter {
  status?: ListingStatus | "ALL";
  page?: number;
  pageSize?: number;
}

/** Status badge mapping */
export const STATUS_BADGE: Record<ListingStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  PENDING_REVIEW: "bg-amber-100 text-amber-800",
  LIVE: "bg-emerald-100 text-emerald-800",
  SUSPENDED: "bg-orange-100 text-orange-800",
  EXPIRED: "bg-red-100 text-red-700",
};

/** Valid status filter values */
export const STATUS_FILTERS = ["ALL", "DRAFT", "PENDING_REVIEW", "LIVE", "SUSPENDED", "EXPIRED"] as const;
