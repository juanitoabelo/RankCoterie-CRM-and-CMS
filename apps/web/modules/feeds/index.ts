/**
 * Feeds Module — Public API
 * 
 * Provides data feed management for external data sources.
 * 
 * @example
 * ```tsx
 * // In a server component
 * import { getFeeds } from "@/modules/feeds";
 * 
 * const { feeds, total } = await getFeeds({ status: "ACTIVE", page: 1 });
 * ```
 */

// Types
/** Feed status type */
export type { FeedStatus } from "./types";
/** Feed with details */
export type { FeedWithDetails } from "./types";
/** Feed filter options */
export type { FeedFilter } from "./types";
/** Paginated feeds response */
export type { PaginatedFeeds } from "./types";

// Queries
/** Get paginated feeds with filters */
export { getFeeds } from "./queries";
/** Get a single feed by ID */
export { getFeedById } from "./queries";
