/**
 * Geo Module — Public API
 * 
 * Provides geographic targeting for regions and geo-images.
 * 
 * @example
 * ```tsx
 * // In a server component
 * import { getRegions, getGeoImages } from "@/modules/geo";
 * 
 * const { regions, total } = await getRegions({ state: "FL", page: 1 });
 * const geoImages = await getGeoImages({ regionId: "region-123" });
 * ```
 */

// Types
/** Area part type */
export type { AreaPart } from "./types";
/** Region with details */
export type { RegionWithDetails } from "./types";
/** Geo image type */
export type { GeoImage } from "./types";
/** Geo image with relations */
export type { GeoImageWithRelations } from "./types";
/** Region filter options */
export type { RegionFilter } from "./types";
/** Geo image filter options */
export type { GeoImageFilter } from "./types";
/** Paginated geo response */
export type { PaginatedGeo } from "./types";

// Queries
/** Get paginated regions with filters */
export { getRegions } from "./queries";
/** Get all regions (no pagination) */
export { getAllRegions } from "./queries";
/** Get a single region by ID */
export { getRegionById } from "./queries";
/** Get all unique states */
export { getStates } from "./queries";
/** Get paginated geo images with filters */
export { getGeoImages } from "./queries";
/** Get a single geo image by ID */
export { getGeoImageById } from "./queries";
