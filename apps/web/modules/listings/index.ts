/**
 * Listings Module — Public API
 * 
 * Provides listing management for the admin panel including CRUD operations,
 * approval workflows, and filtering.
 * 
 * @example
 * ```tsx
 * // In a server component
 * import { getListings, ListingTable } from "@/modules/listings";
 * 
 * const { listings, total, page, totalPages } = await getListings({ status: "PENDING", page: 1 });
 * return <ListingTable listings={listings} />;
 * ```
 * 
 * @example
 * ```tsx
 * // In a server action
 * import { createListing } from "@/modules/listings";
 * 
 * const result = await createListing(formData);
 * if (!result.ok) {
 *   console.error(result.error);
 * }
 * ```
 */

// Types
/** Listing status type */
export type { ListingStatus } from "./types";
/** Listing tier type */
export type { ListingTier } from "./types";
/** Listing with related data */
export type { ListingWithRelations } from "./types";
/** Paginated listings response */
export type { PaginatedListings } from "./types";
/** Listings filter options */
export type { ListingsFilter } from "./types";
/** Status badge configuration */
export { STATUS_BADGE } from "./types";
/** Status filter options */
export { STATUS_FILTERS } from "./types";

// Queries
/** Get paginated listings with filters */
export { getListings } from "./queries";
/** Get a single listing by ID */
export { getListingById } from "./queries";
/** Count listings by status */
export { countListingsByStatus } from "./queries";

// Actions
/** Create a new listing */
export { createListing } from "./actions";
/** Update an existing listing */
export { updateListing } from "./actions";
/** Approve a listing (sets status to LIVE) */
export { approveListing } from "./actions";
/** Reject a listing (sets status to DRAFT) */
export { rejectListing } from "./actions";
/** Form action wrapper for approve */
export { approveListingForm } from "./actions";
/** Form action wrapper for reject */
export { rejectListingForm } from "./actions";
/** Action result type */
export type { ActionResult } from "./actions";
/** Listing form input type */
export type { ListingFormInput } from "./actions";

// Components
/** Listings table component */
export { ListingTable } from "./components/ListingTable";
/** Listings filter component */
export { ListingFilters } from "./components/ListingFilters";
/** Pagination component */
export { Pagination } from "./components/Pagination";
